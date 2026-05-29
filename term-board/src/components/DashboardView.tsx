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

// 達成バッジの定義（達成済みのみ表示・未達は影に隠す）。#464
type BadgeDef = { id: string; label: string; check: (ctx: BadgeCtx) => boolean };
type BadgeCtx = { streak: number; answered: number; categoriesTouched: number; allCategories: number };
const BADGES: BadgeDef[] = [
  { id: "streak-3", label: "3日連続", check: (c) => c.streak >= 3 },
  { id: "streak-7", label: "7日連続", check: (c) => c.streak >= 7 },
  { id: "streak-30", label: "30日連続", check: (c) => c.streak >= 30 },
  { id: "answered-10", label: "10問達成", check: (c) => c.answered >= 10 },
  { id: "answered-100", label: "100問達成", check: (c) => c.answered >= 100 },
  { id: "answered-500", label: "500問達成", check: (c) => c.answered >= 500 },
  { id: "categories-half", label: "半分のカテゴリに挑戦", check: (c) => c.categoriesTouched >= c.allCategories / 2 },
  { id: "categories-all", label: "全カテゴリ制覇", check: (c) => c.allCategories > 0 && c.categoriesTouched === c.allCategories },
];

// 過去 12 週間（84日）分の日付一覧を最古順で返す。
function pastDates(weeks: number): string[] {
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const days: string[] = [];
  const today = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(fmt(d));
  }
  return days;
}

// B3: ダッシュボード（分野別正答率・苦手用語・学習おすすめ・学習記録）。
export function DashboardView({ bookmarks }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [learningLog, setLearningLog] = useState<LearningSession[]>([]);
  const [misses, setMisses] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getTerms(),
      repository.getProgress(),
      repository.getStudyDays(),
      repository.getLearningLog(),
      repository.getMisses(),
    ]).then(([t, p, d, log, m]) => {
      if (!active) return;
      setTerms(t);
      setProgress(p);
      setStudyDays(d);
      setLearningLog(log);
      setMisses(m);
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

  // #464: 学習カバレッジ（全用語のうち何件に触れたか）。
  const coverage = useMemo(() => {
    const touched = terms.filter((t) => progress[t.id]).length;
    const total = terms.length;
    const pct = total ? Math.round((touched / total) * 100) : 0;
    return { touched, total, pct };
  }, [terms, progress]);

  // #464: モード別バランス（quiz / card / interview の累計セッション数）。
  const modeBalance = useMemo(() => {
    const counts = { quiz: 0, card: 0, interview: 0 };
    for (const s of learningLog) {
      if (s.mode === "quiz") counts.quiz++;
      else if (s.mode === "card") counts.card++;
      else if (s.mode === "interview") counts.interview++;
    }
    const total = counts.quiz + counts.card + counts.interview;
    return { ...counts, total };
  }, [learningLog]);

  // #464: 過去 12 週間（84日）の学習日カレンダーヒートマップ。
  const calendar = useMemo(() => {
    const set = new Set(studyDays);
    const days = pastDates(12).map((d) => ({ date: d, studied: set.has(d) }));
    // 週単位（7日 × 12週）に分割。
    const weeks: { date: string; studied: boolean }[][] = [];
    for (let i = 0; i < 12; i++) weeks.push(days.slice(i * 7, (i + 1) * 7));
    return { weeks, totalStudied: days.filter((d) => d.studied).length };
  }, [studyDays]);

  // #464: 達成バッジ（達成済みのみ表示）。
  const earnedBadges = useMemo(() => {
    const categoriesTouched = new Set(
      terms.filter((t) => progress[t.id]).map((t) => t.category),
    ).size;
    const allCategories = new Set(terms.map((t) => t.category)).size;
    const ctx: BadgeCtx = {
      streak,
      answered: totals.answered,
      categoriesTouched,
      allCategories,
    };
    return BADGES.filter((b) => b.check(ctx));
  }, [streak, totals.answered, terms, progress]);

  // F-QUIZ-06: 混同ペア分析。誤答で選んだ選択肢と正しい意味を対比する。
  const confusions = useMemo(() => {
    return terms
      .map((t) => ({ term: t, chosen: misses[t.id] ?? [] }))
      .filter((c) => c.chosen.length > 0)
      .slice(0, 5);
  }, [terms, misses]);

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

  const card = "hig-card p-5";

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
        <h2 className="text-sm font-semibold text-accent">学習おすすめ</h2>
        <p className="mt-1 text-label">{recommendation}</p>
      </div>

      {/* 面接練習の実績（F-INTV-02） */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-label-2">面接練習の実績</h2>
        {interview.asked === 0 ? (
          <p className="text-sm text-label-2">
            まだ面接練習の記録がありません。「面接練習」で答えて自己採点しましょう。
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-label-2">
              練習回数 <span className="font-semibold text-label">{interview.asked}</span> 回
              <span className="ml-2">言えた <span className="font-semibold text-label">{interview.said}</span> 回</span>
            </p>
            <p className="text-sm">
              言えた率 <span className="font-bold text-emerald-700 dark:text-emerald-400">{interview.rate}%</span>
            </p>
          </div>
        )}
      </div>

      {/* 分野別正答率 */}
      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-label-2">分野別の正答率</h2>
        {catStats.length === 0 ? (
          <p className="text-sm text-label-2">まだ解答記録がありません。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {catStats.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-label-2">{c.category}</span>
                  <span className="font-semibold text-label">
                    {c.rate}%<span className="ml-1 text-xs font-normal text-label-2">（{c.correct}/{c.correct + c.wrong}）</span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-fill-quaternary">
                  <div className="h-full rounded-full bg-accent-fill" style={{ width: `${c.rate}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 苦手用語 */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-label-2">苦手な用語（要復習）</h2>
        {weakTerms.length === 0 ? (
          <p className="text-sm text-label-2">苦手な用語はまだありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weakTerms.map((w) => (
              <li key={w.term.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-label">{w.term.term}</span>
                <span className="shrink-0 text-rose-700 dark:text-rose-400">
                  誤答 {w.wrong}/{w.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 混同ペア分析（F-QUIZ-06） */}
      {confusions.length > 0 && (
        <div className={card}>
          <h2 className="mb-2 text-sm font-semibold text-label-2">混同しやすい用語</h2>
          <p className="mb-3 text-xs text-label-2">4択で選んだ誤答と、正しい意味を見比べましょう。</p>
          <ul className="flex flex-col gap-3">
            {confusions.map((c) => (
              <li key={c.term.id}>
                <p className="text-sm font-semibold text-label">{c.term.term}</p>
                {c.chosen.map((ch) => (
                  <p key={ch} className="mt-1 text-sm leading-relaxed text-rose-700 dark:text-rose-400">
                    ✕ 選んだ誤答：{ch}
                  </p>
                ))}
                <p className="mt-1 text-sm leading-relaxed text-emerald-700 dark:text-emerald-400">
                  ◯ 正しい意味：{c.term.meaning}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-label-2">
        学習日数 {studyDays.length} 日 ／ 未学習 {unlearned} 件
      </p>

      {/* === #464: 学習の歩み（純ローカル分析） === */}

      {/* 学習カバレッジ */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-label-2">学習カバレッジ</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-label-2">触れた用語</span>
          <span className="font-semibold text-label">
            {coverage.pct}%<span className="ml-1 text-xs font-normal text-label-2">（{coverage.touched}/{coverage.total} 語）</span>
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-fill-quaternary">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${coverage.pct}%` }} />
        </div>
        {coverage.touched === 0 && (
          <p className="mt-2 text-xs text-label-2">まずは1問解いてみましょう。</p>
        )}
      </div>

      {/* モード別バランス */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-label-2">モード別バランス</h2>
        {modeBalance.total === 0 ? (
          <p className="text-sm text-label-2">まだ学習記録がありません。</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <ModeBar label="4択クイズ" count={modeBalance.quiz} total={modeBalance.total} color="bg-sky-500" />
            <ModeBar label="暗記カード" count={modeBalance.card} total={modeBalance.total} color="bg-emerald-500" />
            <ModeBar label="面接練習" count={modeBalance.interview} total={modeBalance.total} color="bg-amber-500" />
          </div>
        )}
      </div>

      {/* 月別学習カレンダー（草風ヒートマップ） */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-label-2">学習カレンダー（過去12週）</h2>
        <p className="mb-3 text-xs text-label-2">
          学習した日に色が付きます（{calendar.totalStudied} / 84 日）。
        </p>
        <div className="flex gap-1 overflow-x-auto">
          {calendar.weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}${day.studied ? "（学習）" : ""}`}
                  className={`h-3 w-3 rounded-sm ${day.studied ? "bg-emerald-500" : "bg-fill-quaternary"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 達成バッジ */}
      {earnedBadges.length > 0 && (
        <div className={card}>
          <h2 className="mb-2 text-sm font-semibold text-label-2">達成バッジ</h2>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900"
              >
                ★ {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <DataManager />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hig-card px-3 py-3 text-center">
      <p className="text-xs text-label-2">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-label">{value}</p>
    </div>
  );
}

// #464: モード別バランスの 1 本のバー。
function ModeBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-label-2">{label}</span>
        <span className="font-semibold text-label">
          {pct}%<span className="ml-1 text-xs font-normal text-label-2">（{count} 回）</span>
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-fill-quaternary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
