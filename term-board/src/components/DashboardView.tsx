import { useEffect, useMemo, useState } from "react";
import type { Term, Progress, LearningSession } from "../types";
import { repository } from "../api";
import type { UseBookmarks } from "../hooks/useBookmarks";
import { DataManager } from "./DataManager";

type Props = { bookmarks: UseBookmarks };

type CatStat = { category: string; correct: number; wrong: number; rate: number };
type WeakTerm = { term: Term; wrong: number; total: number; rate: number };

// 学習日（YYYY-MM-DD の集合）から現在の連続学習日数（ストリーク）を算出する。
function calcStreak(days: string[]): number {
  const set = new Set(days);
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const today = new Date();
  // 今日が無ければ昨日起点（今日はこれから学習する余地があるため）。
  let cursor = new Date(today);
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

// B3: ダッシュボード（分野別正答率・苦手用語・学習おすすめ・学習記録）。
export function DashboardView({ bookmarks }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [learningLog, setLearningLog] = useState<LearningSession[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getTerms(),
      repository.getProgress(),
      repository.getStudyDays(),
      repository.getLearningLog(),
    ]).then(([t, p, d, log]) => {
      if (!active) return;
      setTerms(t);
      setProgress(p);
      setStudyDays(d);
      setLearningLog(log);
    });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    for (const v of Object.values(progress)) {
      correct += v.correct;
      wrong += v.wrong;
    }
    const answered = correct + wrong;
    return { correct, wrong, answered, rate: answered ? Math.round((correct / answered) * 100) : 0 };
  }, [progress]);

  const catStats = useMemo<CatStat[]>(() => {
    const map = new Map<string, { correct: number; wrong: number }>();
    for (const t of terms) {
      const p = progress[t.id];
      if (!p) continue;
      const cur = map.get(t.category) ?? { correct: 0, wrong: 0 };
      cur.correct += p.correct;
      cur.wrong += p.wrong;
      map.set(t.category, cur);
    }
    return [...map.entries()]
      .map(([category, v]) => {
        const total = v.correct + v.wrong;
        return { category, correct: v.correct, wrong: v.wrong, rate: total ? Math.round((v.correct / total) * 100) : 0 };
      })
      .sort((a, b) => a.rate - b.rate);
  }, [terms, progress]);

  const weakTerms = useMemo<WeakTerm[]>(() => {
    return terms
      .map((t) => {
        const p = progress[t.id];
        const total = p ? p.correct + p.wrong : 0;
        const wrong = p ? p.wrong : 0;
        return { term: t, wrong, total, rate: total ? wrong / total : 0 };
      })
      .filter((w) => w.wrong > 0)
      .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
      .slice(0, 5);
  }, [terms, progress]);

  const unlearned = useMemo(
    () => terms.filter((t) => !progress[t.id]).length,
    [terms, progress],
  );

  const streak = useMemo(() => calcStreak(studyDays), [studyDays]);

  // F-INTV-02: 面接練習の自己採点実績（練習回数・言えた率）。
  const interview = useMemo(() => {
    let asked = 0;
    let said = 0;
    for (const s of learningLog) {
      if (s.mode !== "interview") continue;
      asked += s.asked;
      said += s.correct;
    }
    return { asked, said, rate: asked ? Math.round((said / asked) * 100) : 0 };
  }, [learningLog]);

  const recommendation = useMemo(() => {
    if (totals.answered === 0) return "まずは4択クイズを1問解いてみましょう。";
    if (weakTerms.length > 0) return `苦手な「${weakTerms[0].term.term}」を復習しましょう。`;
    if (unlearned > 0) return `未学習の用語が ${unlearned} 件あります。新しい分野に挑戦しましょう。`;
    if (interview.asked === 0) return "よくできています！面接練習で「言える」かも試しましょう。";
    if (interview.rate < 70) return "面接練習の「言えた率」を上げましょう。模範回答の型を意識して。";
    return "知識も「言える」も好調です。この調子で続けましょう。";
  }, [totals.answered, weakTerms, unlearned, interview]);

  const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";

  return (
    <section className="flex flex-col gap-4">
      {/* サマリ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="解答数" value={`${totals.answered}`} />
        <Stat label="正答率" value={`${totals.rate}%`} />
        <Stat label="連続学習" value={`${streak}日`} />
        <Stat label="★保存" value={`${bookmarks.count}`} />
      </div>

      {/* 学習おすすめ */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-sky-700 dark:text-sky-400">学習おすすめ</h2>
        <p className="mt-1 text-slate-800 dark:text-slate-100">{recommendation}</p>
      </div>

      {/* 面接練習の実績（F-INTV-02） */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">面接練習の実績</h2>
        {interview.asked === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            まだ面接練習の記録がありません。「面接練習」で答えて自己採点しましょう。
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              練習回数 <span className="font-semibold text-slate-900 dark:text-slate-100">{interview.asked}</span> 回
              <span className="ml-2">言えた <span className="font-semibold text-slate-900 dark:text-slate-100">{interview.said}</span> 回</span>
            </p>
            <p className="text-sm">
              言えた率 <span className="font-bold text-emerald-700 dark:text-emerald-400">{interview.rate}%</span>
            </p>
          </div>
        )}
      </div>

      {/* 分野別正答率 */}
      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">分野別の正答率</h2>
        {catStats.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">まだ解答記録がありません。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {catStats.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{c.category}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {c.rate}%<span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">（{c.correct}/{c.correct + c.wrong}）</span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-sky-600 dark:bg-sky-500" style={{ width: `${c.rate}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 苦手用語 */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">苦手な用語（要復習）</h2>
        {weakTerms.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">苦手な用語はまだありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weakTerms.map((w) => (
              <li key={w.term.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-800 dark:text-slate-200">{w.term.term}</span>
                <span className="shrink-0 text-rose-700 dark:text-rose-400">
                  誤答 {w.wrong}/{w.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        学習日数 {studyDays.length} 日 ／ 未学習 {unlearned} 件
      </p>

      <DataManager />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
