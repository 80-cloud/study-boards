import { useEffect, useMemo, useState } from "react";
import type { Term, Progress, LearningSession } from "../types";
import { repository } from "../api";
import { pickWeighted } from "../utils/shuffle";
import { srsWeight } from "../utils/srs";
import { newId } from "../utils/share";

// F-CARD-01: 暗記カード（能動的想起 × 間隔反復）。
// 表=用語、裏=意味/かんたん説明/面接での言い方。クリックで裏返す。
// 「覚えた/まだ」をカード専用の習熟度に記録し、SRS(srsWeight)で苦手・未学習カードを
// 優先出題する。4択(再認)・辞典(参照)と差別化した「思い出して答える」学習。

export function CardView() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [cardProgress, setCardProgress] = useState<Progress>({});
  const [current, setCurrent] = useState<Term | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [category, setCategory] = useState("");
  const [onlyWeak, setOnlyWeak] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([repository.getTerms(), repository.getCardProgress()]).then(([t, cp]) => {
      if (!active) return;
      setTerms(t);
      setCardProgress(cp);
    });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => [...new Set(terms.map((t) => t.category))].sort(), [terms]);

  // 苦手＝「まだ」が「覚えた」を上回るカード。
  const isWeak = (id: string, prog: Progress = cardProgress) => {
    const p = prog[id];
    return !!p && p.wrong > p.correct;
  };

  const weakCount = useMemo(
    () => terms.filter((t) => isWeak(t.id)).length,
    [terms, cardProgress],
  );

  const pool = useMemo(
    () =>
      terms.filter((t) => {
        if (category && t.category !== category) return false;
        if (onlyWeak && !isWeak(t.id)) return false;
        return true;
      }),
    [terms, category, onlyWeak, cardProgress],
  );

  // SRS 重み付きで次のカードを選ぶ（直前と同じは避ける）。
  const pickFrom = (list: Term[], prog: Progress, prev: Term | null): Term | null => {
    if (list.length === 0) return null;
    let picked = pickWeighted(list, (t) => srsWeight(prog[t.id]));
    if (list.length > 1 && prev) {
      while (picked.id === prev.id) picked = pickWeighted(list, (t) => srsWeight(prog[t.id]));
    }
    return picked;
  };

  // pool が用意できたら／フィルタ変更で current が pool 外になったら出題し直す。
  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null);
      return;
    }
    if (current === null || !pool.some((t) => t.id === current.id)) {
      setFlipped(false);
      setCurrent(pickFrom(pool, cardProgress, null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  // 「覚えた/まだ」を記録し、次のカードへ。
  const assess = (known: boolean) => {
    if (!current) return;
    const id = current.id;
    // カード専用の習熟度を更新（SRS の入力）。
    const cur = cardProgress[id] ?? { correct: 0, wrong: 0, lastAnsweredAt: "" };
    const nextProgress: Progress = {
      ...cardProgress,
      [id]: {
        correct: cur.correct + (known ? 1 : 0),
        wrong: cur.wrong + (known ? 0 : 1),
        lastAnsweredAt: new Date().toISOString(),
      },
    };
    setCardProgress(nextProgress);
    void repository.saveCardProgress(nextProgress);
    // 学習ログ・学習日（ダッシュボード／振り返り／ストリーク用）。
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

    // 次のカード（更新後の習熟度・フィルタを反映）。
    const nextPool = onlyWeak ? pool.filter((t) => isWeak(t.id, nextProgress) || t.id === id) : pool;
    setFlipped(false);
    setCurrent(pickFrom(nextPool.length > 0 ? nextPool : pool, nextProgress, current));
  };

  if (terms.length === 0) {
    return <p className="text-center text-label-2">カードに使える用語がありません。</p>;
  }

  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      {/* フィルタ */}
      <div className="hig-card flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <label htmlFor="card-cat" className="text-sm font-medium text-label-2">分野</label>
          <select
            id="card-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">全分野</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-label-2">
          <input type="checkbox" checked={onlyWeak} onChange={(e) => setOnlyWeak(e.target.checked)} className="h-4 w-4" />
          苦手だけ（{weakCount}）
        </label>
        {sessionDone > 0 && (
          <p className="ml-auto text-sm font-medium text-label-2">
            このセット：覚えた {sessionKnown} ／ {sessionDone}
          </p>
        )}
      </div>

      {pool.length === 0 ? (
        <p className="text-center text-sm text-label-2">
          {onlyWeak ? "苦手なカードはありません。よくできています！" : "このカードがありません。"}
        </p>
      ) : current ? (
        <>
          <p className="text-center text-sm text-label-2">
            思い出してから裏返しましょう（苦手なカードほど多く出ます）
          </p>

          {/* カード本体（クリックで裏返す） */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-pressed={flipped}
            className="hig-card min-h-56 w-full p-6 text-left transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-accent">{current.category}</span>
              {isWeak(current.id) && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900 dark:text-rose-200">復習</span>
              )}
            </div>
            {!flipped ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-3xl font-bold text-label">{current.term}</p>
                <p className="text-xs text-label-2">タップで意味を見る</p>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-lg font-bold text-label">{current.term}</p>
                {current.plainMeaning && (
                  <p className="text-sm leading-relaxed text-label">
                    <span className="font-semibold text-accent">かんたんに：</span>
                    {current.plainMeaning}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-label-2">
                  <span className="font-semibold text-label">意味：</span>
                  {current.meaning}
                </p>
                <p className="text-sm leading-relaxed text-label-2">
                  <span className="font-semibold text-label">面接での言い方：</span>
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
                className="rounded-control bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-[0.98]"
              >
                ◯ 覚えた
              </button>
              <button
                type="button"
                onClick={() => assess(false)}
                className="rounded-control bg-fill-quaternary px-5 py-2.5 font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
              >
                △ まだ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="hig-btn-primary px-5 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              意味を見る
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
