import { useCallback, useEffect, useRef, useState } from "react";
import type { Term, InterviewQuestion, UserContent, Flashcard, PortfolioCard } from "../types";
import { repository } from "../api";
import { newId, encodeShareCode, decodeShareCode } from "../utils/share";

// F-USER-01/02: ユーザー作問データの管理（CRUD）と共有（エクスポート/インポート）。
// 保存は api/ 層（localStorage）経由。画面は保存先を知らない。

export type NewQuizTerm = Omit<Term, "id" | "source">;
export type NewInterviewQuestion = Omit<InterviewQuestion, "id" | "source">;
export type NewFlashcard = Omit<Flashcard, "id" | "source">;
export type NewPortfolioCard = Omit<PortfolioCard, "id" | "source">;

export type UseUserContent = {
  content: UserContent;
  addQuizTerm: (t: NewQuizTerm) => void;
  addInterviewQuestion: (q: NewInterviewQuestion) => void;
  /** 既存4択用語を更新（id・source は保持）。#389 */
  updateQuizTerm: (id: string, t: NewQuizTerm) => void;
  /** 既存面接Q&Aを更新（id・source は保持）。#389 */
  updateInterviewQuestion: (id: string, q: NewInterviewQuestion) => void;
  removeQuizTerm: (id: string) => void;
  removeInterviewQuestion: (id: string) => void;
  /** 逆質問を追加（重複は無視）。#425 */
  addReverseQuestion: (q: string) => void;
  /** 逆質問を削除。#425 */
  removeReverseQuestion: (q: string) => void;
  /** 暗記カードを追加。#427 */
  addFlashcard: (c: NewFlashcard) => void;
  /** 暗記カードを更新（id・source は保持）。#427 */
  updateFlashcard: (id: string, c: NewFlashcard) => void;
  /** 暗記カードを削除。#427 */
  removeFlashcard: (id: string) => void;
  /** 成果物カードを追加。#456 */
  addPortfolioCard: (p: NewPortfolioCard) => void;
  /** 成果物カードを更新（id・source は保持）。#456 */
  updatePortfolioCard: (id: string, p: NewPortfolioCard) => void;
  /** 成果物カードを削除。#456 */
  removePortfolioCard: (id: string) => void;
  exportCode: () => string;
  /** 共有コードを取り込み、追加件数を返す。失敗時は例外を投げる。 */
  importCode: (code: string) => { quiz: number; interview: number; reverse: number; flashcard: number; portfolio: number };
};

const EMPTY: UserContent = {
  quizTerms: [],
  interviewQuestions: [],
  reverseQuestions: [],
  flashcards: [],
  portfolioCards: [],
};

export function useUserContent(): UseUserContent {
  const [content, setContent] = useState<UserContent>(EMPTY);
  // データの非同期読み込みが完了したか。完了前の保存（空状態での上書き＝データ消失）を防ぐ。
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    repository.getUserContent().then((c) => {
      if (!active) return;
      setContent(c);
      loadedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, []);

  // すべての作問データ更新はここを通す。読み込み完了前は保存しない（空上書き＝消失の防止）。
  const commit = useCallback((updater: (prev: UserContent) => UserContent) => {
    if (!loadedRef.current) {
      console.warn("[term-board] 読み込み完了前のため保存をスキップしました。少し待って再操作してください。");
      return;
    }
    setContent((prev) => {
      const next = updater(prev);
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const addQuizTerm = useCallback(
    (t: NewQuizTerm) => {
      commit((prev) => ({
        ...prev,
        quizTerms: [...prev.quizTerms, { ...t, id: newId(), source: "user" }],
      }));
    },
    [commit],
  );

  const addInterviewQuestion = useCallback(
    (q: NewInterviewQuestion) => {
      commit((prev) => ({
        ...prev,
        interviewQuestions: [...prev.interviewQuestions, { ...q, id: newId(), source: "user" }],
      }));
    },
    [commit],
  );

  // 既存4択用語の更新（id・source を保持）。#389
  const updateQuizTerm = useCallback(
    (id: string, t: NewQuizTerm) => {
      commit((prev) => ({
        ...prev,
        quizTerms: prev.quizTerms.map((q) => (q.id === id ? { ...q, ...t } : q)),
      }));
    },
    [commit],
  );

  // 既存面接Q&Aの更新（id・source を保持）。#389
  const updateInterviewQuestion = useCallback(
    (id: string, q: NewInterviewQuestion) => {
      commit((prev) => ({
        ...prev,
        interviewQuestions: prev.interviewQuestions.map((iq) =>
          iq.id === id ? { ...iq, ...q } : iq,
        ),
      }));
    },
    [commit],
  );

  const removeQuizTerm = useCallback(
    (id: string) => {
      commit((prev) => ({ ...prev, quizTerms: prev.quizTerms.filter((t) => t.id !== id) }));
    },
    [commit],
  );

  const removeInterviewQuestion = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        interviewQuestions: prev.interviewQuestions.filter((q) => q.id !== id),
      }));
    },
    [commit],
  );

  const addReverseQuestion = useCallback(
    (q: string) => {
      const v = q.trim();
      if (!v) return;
      commit((prev) => {
        const current = prev.reverseQuestions ?? [];
        if (current.includes(v)) return prev; // 重複は追加しない
        return { ...prev, reverseQuestions: [...current, v] };
      });
    },
    [commit],
  );

  const removeReverseQuestion = useCallback(
    (q: string) => {
      commit((prev) => ({
        ...prev,
        reverseQuestions: (prev.reverseQuestions ?? []).filter((x) => x !== q),
      }));
    },
    [commit],
  );

  const addFlashcard = useCallback(
    (c: NewFlashcard) => {
      commit((prev) => ({
        ...prev,
        flashcards: [...(prev.flashcards ?? []), { ...c, id: newId(), source: "user" }],
      }));
    },
    [commit],
  );

  const updateFlashcard = useCallback(
    (id: string, c: NewFlashcard) => {
      commit((prev) => ({
        ...prev,
        flashcards: (prev.flashcards ?? []).map((f) => (f.id === id ? { ...f, ...c } : f)),
      }));
    },
    [commit],
  );

  const removeFlashcard = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        flashcards: (prev.flashcards ?? []).filter((f) => f.id !== id),
      }));
    },
    [commit],
  );

  const addPortfolioCard = useCallback(
    (p: NewPortfolioCard) => {
      commit((prev) => ({
        ...prev,
        portfolioCards: [...(prev.portfolioCards ?? []), { ...p, id: newId(), source: "user" }],
      }));
    },
    [commit],
  );

  const updatePortfolioCard = useCallback(
    (id: string, p: NewPortfolioCard) => {
      commit((prev) => ({
        ...prev,
        portfolioCards: (prev.portfolioCards ?? []).map((c) => (c.id === id ? { ...c, ...p } : c)),
      }));
    },
    [commit],
  );

  const removePortfolioCard = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        portfolioCards: (prev.portfolioCards ?? []).filter((c) => c.id !== id),
      }));
    },
    [commit],
  );

  const exportCode = useCallback(() => encodeShareCode(content), [content]);

  // 取り込み時はIDを振り直して衝突を避け、既存に追記する。
  // 取り込んだ問題は他者作なので source="shared" を付与（自作 user と区別。#385）。
  // 逆質問は文字列なのでIDなし、重複は無視（#425）。
  const importCode = useCallback(
    (code: string) => {
      // 読み込み完了前の取り込みは既存データを空に上書きしうるため拒否する。
      if (!loadedRef.current) {
        throw new Error("データ読み込み中です。少し待ってから取り込みを実行してください。");
      }
      const incoming = decodeShareCode(code);
      const quiz = incoming.quizTerms.map((t) => ({ ...t, id: newId(), source: "shared" as const }));
      const interview = incoming.interviewQuestions.map((q) => ({
        ...q,
        id: newId(),
        source: "shared" as const,
      }));
      const incomingReverse = incoming.reverseQuestions ?? [];
      const incomingFlash = (incoming.flashcards ?? []).map((f) => ({
        ...f,
        id: newId(),
        source: "shared" as const,
      }));
      const incomingPortfolio = (incoming.portfolioCards ?? []).map((p) => ({
        ...p,
        id: newId(),
        source: "shared" as const,
      }));
      let addedReverse = 0;
      setContent((prev) => {
        const prevReverse = prev.reverseQuestions ?? [];
        const mergedReverse = [...prevReverse];
        for (const q of incomingReverse) {
          if (!mergedReverse.includes(q)) {
            mergedReverse.push(q);
            addedReverse++;
          }
        }
        const next: UserContent = {
          quizTerms: [...prev.quizTerms, ...quiz],
          interviewQuestions: [...prev.interviewQuestions, ...interview],
          reverseQuestions: mergedReverse,
          flashcards: [...(prev.flashcards ?? []), ...incomingFlash],
          portfolioCards: [...(prev.portfolioCards ?? []), ...incomingPortfolio],
        };
        void repository.saveUserContent(next);
        return next;
      });
      return {
        quiz: quiz.length,
        interview: interview.length,
        reverse: addedReverse,
        flashcard: incomingFlash.length,
        portfolio: incomingPortfolio.length,
      };
    },
    [],
  );

  return {
    content,
    addQuizTerm,
    addInterviewQuestion,
    updateQuizTerm,
    updateInterviewQuestion,
    removeQuizTerm,
    removeInterviewQuestion,
    addReverseQuestion,
    removeReverseQuestion,
    addFlashcard,
    updateFlashcard,
    removeFlashcard,
    addPortfolioCard,
    updatePortfolioCard,
    removePortfolioCard,
    exportCode,
    importCode,
  };
}
