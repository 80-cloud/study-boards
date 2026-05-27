import { useEffect, useMemo, useState } from "react";
import type { LearningSession } from "../types";
import { repository } from "../api";

// F-LOG-03 学習メモ ＋ F-LOG-04 振り返り一覧。
// 今日のメモ（自動保存）と、学習した日の活動（面接/カード練習）・メモを時系列で振り返る。

const today = () => new Date().toLocaleDateString("sv-SE");

type DayRow = {
  date: string;
  interview: { asked: number; said: number };
  card: { asked: number; said: number };
  note: string;
};

export function ReviewView() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [log, setLog] = useState<LearningSession[]>([]);
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([repository.getNotes(), repository.getLearningLog(), repository.getStudyDays()]).then(
      ([n, l, d]) => {
        if (!active) return;
        setNotes(n);
        setLog(l);
        setStudyDays(d);
        setDraft(n[today()] ?? "");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const onChangeDraft = (text: string) => {
    setDraft(text);
    const d = today();
    setNotes((prev) => {
      const next = { ...prev };
      if (text.trim() === "") delete next[d];
      else next[d] = text;
      return next;
    });
    void repository.saveNote(d, text);
  };

  // 日付ごとに学習セッション・メモを集計し、新しい順に並べる（F-LOG-04）。
  const rows = useMemo<DayRow[]>(() => {
    const map = new Map<string, DayRow>();
    const ensure = (date: string) => {
      let r = map.get(date);
      if (!r) {
        r = { date, interview: { asked: 0, said: 0 }, card: { asked: 0, said: 0 }, note: notes[date] ?? "" };
        map.set(date, r);
      }
      return r;
    };
    for (const s of log) {
      const date = s.startedAt.slice(0, 10); // ISO の YYYY-MM-DD
      const r = ensure(date);
      const bucket = s.mode === "card" ? r.card : r.interview; // quiz は Progress 側で集計
      if (s.mode === "card" || s.mode === "interview") {
        bucket.asked += s.asked;
        bucket.said += s.correct;
      }
    }
    for (const d of studyDays) ensure(d);
    for (const d of Object.keys(notes)) ensure(d);
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [log, studyDays, notes]);

  const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";

  return (
    <section className="flex flex-col gap-4">
      {/* 今日のメモ（F-LOG-03） */}
      <div className={card}>
        <label htmlFor="today-note" className="text-sm font-semibold text-sky-700 dark:text-sky-400">
          今日の学習メモ
        </label>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">気づき・覚えにくい用語・面接で詰まった点など（自動保存）</p>
        <textarea
          id="today-note"
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          rows={3}
          placeholder="例：TCP/UDPの違いが曖昧。明日もう一度。"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 振り返り一覧（F-LOG-04） */}
      <div className={card}>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">これまでの振り返り</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">まだ記録がありません。学習するとここに日々の記録が並びます。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.date} className="border-l-2 border-sky-200 pl-3 dark:border-sky-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.date}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {r.interview.asked > 0 && (
                    <span>面接練習 {r.interview.asked}回・言えた {r.interview.said}</span>
                  )}
                  {r.card.asked > 0 && <span>暗記カード {r.card.asked}枚・覚えた {r.card.said}</span>}
                  {r.interview.asked === 0 && r.card.asked === 0 && <span>4択クイズで学習</span>}
                </div>
                {r.note && (
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {r.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
