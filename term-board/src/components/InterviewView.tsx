import { useEffect, useMemo, useState } from "react";
import type { InterviewQuestion, LearningSession } from "../types";
import { repository } from "../api";
import { pickRandom } from "../utils/shuffle";
import { newId } from "../utils/share";
import { ReverseQuestionStock } from "./ReverseQuestionStock";
import bundledQuestions from "../data/interviewQuestions.json";

type Props = {
  // ユーザー作問の面接Q&A（F-USER）。
  userQuestions: InterviewQuestion[];
};

// 同梱の頻出質問（B4・テンプレ/NG例/タグつき）。
const bundled = bundledQuestions as InterviewQuestion[];

// F-INTV-01（面接想定問答）＋ B4（想定質問集・頻出タグ・テンプレ・NG例）＋ F-USER。
// 同梱用語の interview を「『term』とは？」として、頻出質問・ユーザー作問と混ぜて出す。
export function InterviewView({ userQuestions }: Props) {
  const [builtin, setBuiltin] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tag, setTag] = useState<string>(""); // "" = すべて
  // F-INTV-02: この練習セッションの自己採点カウンタ（言えた / 練習数）。
  const [sessionAsked, setSessionAsked] = useState(0);
  const [sessionSaid, setSessionSaid] = useState(0);

  useEffect(() => {
    let active = true;
    repository.getTerms().then((terms) => {
      if (!active) return;
      // 同梱用語（source !== "user"）から面接質問を導出。
      const derived: InterviewQuestion[] = terms
        .filter((t) => t.source !== "user")
        .map((t) => ({
          id: `builtin-${t.id}`,
          category: t.category,
          question: `「${t.term}」とは？`,
          answer: t.interview,
          source: "builtin" as const,
        }));
      setBuiltin(derived);
    });
    return () => {
      active = false;
    };
  }, []);

  const allQuestions = useMemo(
    () => [...bundled, ...builtin, ...userQuestions],
    [builtin, userQuestions],
  );

  const tags = useMemo(
    () => [...new Set(allQuestions.flatMap((q) => q.tags ?? []))].sort(),
    [allQuestions],
  );

  const pool = useMemo(
    () => (tag ? allQuestions.filter((q) => q.tags?.includes(tag)) : allQuestions),
    [allQuestions, tag],
  );

  // pool が揃ったら／タグ変更で pool 外になったら出題し直す。
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null);
      return;
    }
    if (current === null || !pool.some((q) => q.id === current.id)) {
      setRevealed(false);
      setCurrent(pickRandom(pool));
    }
  }, [pool, current]);

  const next = () => {
    if (pool.length === 0) return;
    setRevealed(false);
    setCurrent((prev) => {
      let picked = pickRandom(pool);
      if (pool.length > 1 && prev) {
        while (picked.id === prev.id) picked = pickRandom(pool);
      }
      return picked;
    });
  };

  // F-INTV-02: 自己採点（言えた/言えなかった）を学習ログに記録し、次の質問へ進む。
  // 面接練習も studyDays に効くよう、解答時に学習日を記録する。
  const selfAssess = (said: boolean) => {
    const session: LearningSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      mode: "interview",
      asked: 1,
      correct: said ? 1 : 0,
    };
    void repository.appendLearningSession(session);
    void repository.recordStudyDay(new Date().toLocaleDateString("sv-SE"));
    setSessionAsked((n) => n + 1);
    if (said) setSessionSaid((n) => n + 1);
    next();
  };

  if (pool.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        面接の質問がありません。「マイ問題」で追加できます。
      </p>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-6">
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          声に出して答えてから「模範回答を見る」
        </p>
        {sessionAsked > 0 && (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300" aria-live="polite">
            この練習：言えた {sessionSaid} ／ {sessionAsked}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="iv-tag" className="text-sm font-medium text-slate-600 dark:text-slate-300">タグ</label>
            <select
              id="iv-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">すべて</option>
              {tags.map((tg) => (
                <option key={tg} value={tg}>{tg}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-sky-700 dark:text-sky-400">{current.category}</span>
          {current.source === "user" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              みんなの問題
            </span>
          )}
          {current.tags?.map((tg) => (
            <span key={tg} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">
              {tg}
            </span>
          ))}
        </div>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{current.question}</h2>
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          模範回答を見る
        </button>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">模範回答：</span>
            {current.answer}
          </p>
          {current.template && (
            <div className="mt-3 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-100 dark:bg-sky-950 dark:ring-sky-900">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-sky-800 dark:text-sky-300">回答の型：</span>
                {current.template}
              </p>
            </div>
          )}
          {current.ngExample && (
            <div className="mt-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100 dark:bg-rose-950 dark:ring-rose-900">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-rose-800 dark:text-rose-300">NG例と改善：</span>
                {current.ngExample}
              </p>
            </div>
          )}
          {current.memo && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">メモ：</span>
              {current.memo}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              自分の言葉で言えましたか？
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selfAssess(true)}
                autoFocus
                className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                ◯ 言えた
              </button>
              <button
                type="button"
                onClick={() => selfAssess(false)}
                className="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold text-slate-800 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                △ 言えなかった
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
      <ReverseQuestionStock />
    </div>
  );
}
