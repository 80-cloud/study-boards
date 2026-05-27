import { useEffect, useState } from "react";
import type { Term, LearningSession } from "../types";
import { repository } from "../api";
import { pickRandom } from "../utils/shuffle";
import { newId } from "../utils/share";

// F-CARD-01: 暗記カード（要件定義書 §13）。
// 表=用語、裏=意味/かんたん説明/面接での言い方。クリックで裏返す。
// 「覚えた/まだ」自己評価は学習ログ（mode:card）へ記録し studyDays にも効かせる。

export function CardView() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [current, setCurrent] = useState<Term | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionKnown, setSessionKnown] = useState(0);

  useEffect(() => {
    let active = true;
    repository.getTerms().then((t) => {
      if (!active) return;
      setTerms(t);
      if (t.length > 0) setCurrent(pickRandom(t));
    });
    return () => {
      active = false;
    };
  }, []);

  const nextCard = (prev: Term | null) => {
    let picked = pickRandom(terms);
    if (terms.length > 1 && prev) {
      while (picked.id === prev.id) picked = pickRandom(terms);
    }
    return picked;
  };

  // 「覚えた/まだ」を学習ログへ記録し、次のカードへ。
  const assess = (known: boolean) => {
    const session: LearningSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      mode: "card",
      asked: 1,
      correct: known ? 1 : 0,
    };
    void repository.appendLearningSession(session);
    void repository.recordStudyDay(new Date().toLocaleDateString("sv-SE"));
    setSessionDone((n) => n + 1);
    if (known) setSessionKnown((n) => n + 1);
    setFlipped(false);
    setCurrent((prev) => (terms.length > 0 ? nextCard(prev) : null));
  };

  if (terms.length === 0 || !current) {
    return <p className="text-center text-slate-500 dark:text-slate-400">カードに使える用語がありません。</p>;
  }

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">カードをタップして意味を確認しましょう。</p>
        {sessionDone > 0 && (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            このセット：覚えた {sessionKnown} ／ {sessionDone}
          </p>
        )}
      </div>

      {/* カード本体（クリックで裏返す） */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        className="min-h-56 w-full rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-800 dark:ring-slate-700 dark:hover:ring-sky-500"
      >
        <p className="text-sm font-medium text-sky-700 dark:text-sky-400">{current.category}</p>
        {!flipped ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{current.term}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">タップで意味を見る</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{current.term}</p>
            {current.plainMeaning && (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-sky-800 dark:text-sky-300">かんたんに：</span>
                {current.plainMeaning}
              </p>
            )}
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">意味：</span>
              {current.meaning}
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">面接での言い方：</span>
              {current.interview}
            </p>
          </div>
        )}
      </button>

      {/* 自己評価（裏面のときだけ） */}
      {flipped ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => assess(true)}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            ◯ 覚えた
          </button>
          <button
            type="button"
            onClick={() => assess(false)}
            className="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold text-slate-800 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            △ まだ
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          意味を見る
        </button>
      )}
    </section>
  );
}
