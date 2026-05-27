import { useCallback, useEffect, useMemo, useState } from "react";
import type { Term, Progress } from "../types";
import { repository } from "../api";
import { shuffle, pickRandom } from "../utils/shuffle";

// 1問分の出題データ。options は正解 meaning と distractors を混ぜてシャッフル済み（F-QUIZ-03）。
export type Question = {
  term: Term;
  options: string[];
  answer: string; // 正解の選択肢（= term.meaning）
};

export type QuizStatus = "loading" | "ready" | "error";

// 出題対象の用語1件から、選択肢をシャッフルした1問を組み立てる。
function buildQuestion(term: Term): Question {
  const options = shuffle([term.meaning, ...term.distractors]);
  return { term, options, answer: term.meaning };
}

export type UseQuiz = {
  status: QuizStatus;
  categories: string[];
  category: string; // "" = 全分野
  setCategory: (c: string) => void;
  question: Question | null;
  selected: string | null; // 未回答なら null
  isCorrect: boolean | null;
  answeredCount: number;
  correctCount: number;
  answer: (choice: string) => void;
  next: () => void;
};

export function useQuiz(): UseQuiz {
  const [terms, setTerms] = useState<Term[]>([]);
  // 進捗の現在値は Phase3 のダッシュボードで読む。MVP では記録（localStorage 保存）だけ行う。
  const [, setProgress] = useState<Progress>({});
  const [status, setStatus] = useState<QuizStatus>("loading");

  const [category, setCategory] = useState<string>("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // 初回ロード（api/ 層経由＝データの出所を画面は知らない）。
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [loadedTerms, loadedProgress] = await Promise.all([
          repository.getTerms(),
          repository.getProgress(),
        ]);
        if (!active) return;
        setTerms(loadedTerms);
        setProgress(loadedProgress);
        setStatus(loadedTerms.length > 0 ? "ready" : "error");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(terms.map((t) => t.category))].sort(),
    [terms],
  );

  // 現在の分野で出題可能な用語（F-QUIZ-04 分野別・全分野ランダム）。
  const pool = useMemo(
    () => (category ? terms.filter((t) => t.category === category) : terms),
    [terms, category],
  );

  // 次の問題を出す。直前と同じ用語が連続しないよう軽く避ける。
  const next = useCallback(() => {
    if (pool.length === 0) {
      setQuestion(null);
      return;
    }
    setSelected(null);
    setQuestion((prev) => {
      let picked = pickRandom(pool);
      if (pool.length > 1 && prev) {
        while (picked.id === prev.term.id) picked = pickRandom(pool);
      }
      return buildQuestion(picked);
    });
  }, [pool]);

  // pool が変わったら（初回ロード／分野変更）出題し直す。
  useEffect(() => {
    if (status !== "ready") return;
    next();
    // next は pool 依存。pool が同一参照のときは再出題しない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, status]);

  // 回答（F-QUIZ-02 即時採点 + F-PROG-01 進捗記録）。
  const answer = useCallback(
    (choice: string) => {
      if (!question || selected !== null) return; // 二重回答防止
      setSelected(choice);
      const correct = choice === question.answer;
      setAnsweredCount((n) => n + 1);
      if (correct) setCorrectCount((n) => n + 1);

      const id = question.term.id;
      setProgress((prev) => {
        const cur = prev[id] ?? { correct: 0, wrong: 0, lastAnsweredAt: "" };
        const updated: Progress = {
          ...prev,
          [id]: {
            correct: cur.correct + (correct ? 1 : 0),
            wrong: cur.wrong + (correct ? 0 : 1),
            lastAnsweredAt: new Date().toISOString(),
          },
        };
        // 保存は fire-and-forget（ローカル即時判定なので UI はブロックしない）。
        void repository.saveProgress(updated);
        return updated;
      });
    },
    [question, selected],
  );

  const isCorrect = selected === null || !question ? null : selected === question.answer;

  return {
    status,
    categories,
    category,
    setCategory,
    question,
    selected,
    isCorrect,
    answeredCount,
    correctCount,
    answer,
    next,
  };
}
