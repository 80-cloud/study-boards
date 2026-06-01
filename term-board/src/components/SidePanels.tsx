import { useEffect, useMemo, useState } from "react";
import type { Term, Progress } from "../types";
import { repository } from "../api";

// #519: 暗記カードの「下」に置く学習サポート（進捗・苦手）。
// 横サイドパネル案（クイズ深掘り・辞典ナビ）は「読みづらい」と却下されたため、
// 暗記カードのサポートのみ採用し、配置は右側ではなくカード下に変更した。
// PC（lg+）限定で表示し、モバイル体験は変えない。

// 連続学習日数（DashboardView と同じロジックの軽量版）。
function calcStreak(days: string[]): number {
  const set = new Set(days);
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const cursor = new Date();
  if (!set.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(fmt(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(fmt(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// 学習サポートパネル（連続学習・カバレッジ・苦手用語TOP3）。
// layout="row" のとき PC で3枚を横並び（カード下配置向け）、
// "column"（既定）のとき縦積み。
export function StudyProgressPanel({ layout = "column" }: { layout?: "column" | "row" }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [studyDays, setStudyDays] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([repository.getTerms(), repository.getProgress(), repository.getStudyDays()]).then(
      ([t, p, d]) => {
        if (!active) return;
        setTerms(t);
        setProgress(p);
        setStudyDays(d);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const streak = useMemo(() => calcStreak(studyDays), [studyDays]);
  const coverage = useMemo(() => {
    const touched = terms.filter((t) => progress[t.id]).length;
    const total = terms.length;
    return { touched, total, pct: total ? Math.round((touched / total) * 100) : 0 };
  }, [terms, progress]);
  const weak = useMemo(() => {
    return terms
      .map((t) => {
        const p = progress[t.id];
        const total = p ? p.correct + p.wrong : 0;
        return { term: t, wrong: p ? p.wrong : 0, rate: total ? (p ? p.wrong : 0) / total : 0 };
      })
      .filter((w) => w.wrong > 0)
      .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
      .slice(0, 3);
  }, [terms, progress]);

  // 下配置（row）では3枚を横並び、サイド配置（column）では縦積み。
  const cardsCls = layout === "row" ? "grid grid-cols-3 gap-3" : "flex flex-col gap-3";

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-label-2">学習サポート</h2>
      <div className={cardsCls}>
        <div className="hig-card flex items-center justify-between p-3">
          <span className="text-xs text-label-2">連続学習</span>
          <span className="text-base font-bold text-label">{streak}日</span>
        </div>
        <div className="hig-card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-label-2">カバレッジ</span>
            <span className="font-bold text-label">{coverage.pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fill-quaternary">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${coverage.pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-label-3">
            {coverage.touched}/{coverage.total} 語
          </p>
        </div>
        <div className="hig-card p-3">
          <p className="mb-2 text-xs font-semibold text-label-2">苦手な用語</p>
          {weak.length === 0 ? (
            <p className="text-[11px] text-label-3">まだありません。</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {weak.map((w) => (
                <li key={w.term.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-label">{w.term.term}</span>
                  <span className="shrink-0 text-[11px] text-rose-700 dark:text-rose-400">誤 {w.wrong}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
