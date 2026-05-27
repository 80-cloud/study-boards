import { useEffect, useMemo, useState } from "react";
import type { InterviewQuestion } from "../types";
import { repository } from "../api";
import { pickRandom } from "../utils/shuffle";

type Props = {
  // ユーザー作問の面接Q&A（F-USER）。
  userQuestions: InterviewQuestion[];
};

// F-INTV-01（面接想定問答）の最小実装＋F-USER の面接Q&A表示。
// 同梱用語の interview を「『term』とは？」の質問として使い、ユーザー作問のQ&Aと混ぜて出す。
export function InterviewView({ userQuestions }: Props) {
  const [builtin, setBuiltin] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);

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

  const pool = useMemo(
    () => [...builtin, ...userQuestions],
    [builtin, userQuestions],
  );

  // pool が揃ったら最初の質問を出す。
  useEffect(() => {
    if (pool.length > 0 && current === null) {
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

  if (pool.length === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        面接の質問がありません。「マイ問題」で追加できます。
      </p>
    );
  }

  if (!current) return null;

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        質問に声に出して答えてから「模範回答を見る」で答え合わせ
      </p>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-sky-700 dark:text-sky-400">{current.category}</span>
          {current.source === "user" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              みんなの問題
            </span>
          )}
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
          {current.memo && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">メモ：</span>
              {current.memo}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            autoFocus
            className="mt-4 rounded-xl bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            次の質問 →
          </button>
        </div>
      )}
    </section>
  );
}
