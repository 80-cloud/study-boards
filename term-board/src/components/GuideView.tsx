import { useMemo, useState } from "react";
import type { InterviewQuestion } from "../types";
import bundledQuestions from "../data/interviewQuestions.json";

type Props = {
  // ユーザー作問の面接Q&A（F-USER）。
  userQuestions: InterviewQuestion[];
};

const bundled = bundledQuestions as InterviewQuestion[];

// 分類（面接の論点カテゴリ）の表示順。未定義は末尾。
const CATEGORY_ORDER = ["志望動機", "自己PR", "行動面接", "技術質問", "逆質問"];

// 解説集：面接で訊かれる「論点（質問）×分類×模範解答」の一覧。
// 用語の語彙は「用語辞典」が担うため、ここでは扱わない（役割分離）。
export function GuideView({ userQuestions }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo<InterviewQuestion[]>(() => [...bundled, ...userQuestions], [userQuestions]);

  const categories = useMemo(() => {
    const set = [...new Set(all.map((q) => q.category))];
    return set.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (category && e.category !== category) return false;
      if (q && !`${e.question} ${e.answer} ${e.template ?? ""} ${e.ngExample ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, category]);

  const groups = useMemo(
    () =>
      categories
        .map((cat) => ({ category: cat, rows: filtered.filter((e) => e.category === cat) }))
        .filter((g) => g.rows.length > 0),
    [categories, filtered],
  );

  return (
    <section className="flex flex-col gap-4">
      <p className="rounded-xl bg-sky-50 p-3 text-sm text-slate-700 ring-1 ring-sky-100 dark:bg-sky-950 dark:text-slate-200 dark:ring-sky-900">
        面接で訊かれる<strong className="font-semibold">論点（質問）</strong>の模範解答集です。用語の意味を引きたいときは「用語辞典」をご利用ください。
      </p>

      {/* 検索・分類フィルタ */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div>
          <label htmlFor="guide-search" className="sr-only">論点を検索</label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="質問・模範解答で検索"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="guide-cat" className="text-sm font-medium text-slate-600 dark:text-slate-300">分類</label>
          <select
            id="guide-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">{filtered.length} 件の論点</p>

      {groups.map((g) => (
        <div key={g.category}>
          <h2 className="mb-2 border-b-2 border-sky-200 pb-1 text-center text-sm font-bold text-sky-700 dark:border-sky-800 dark:text-sky-400">
            — {g.category} —
          </h2>
          <ul className="flex flex-col gap-2">
            {g.rows.map((e) => {
              const open = openId === e.id;
              return (
                <li key={e.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : e.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">{e.question}</span>
                    <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">{e.category}</span>
                    <span aria-hidden="true" className="shrink-0 text-sm text-slate-400">{open ? "−" : "＋"}</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-3 py-3 text-sm leading-relaxed dark:border-slate-700">
                      <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">模範回答：</span>{e.answer}</p>
                      {e.template && (
                        <div className="mt-2 rounded-lg bg-sky-50 p-2 ring-1 ring-sky-100 dark:bg-sky-950 dark:ring-sky-900">
                          <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-sky-800 dark:text-sky-300">回答の型：</span>{e.template}</p>
                        </div>
                      )}
                      {e.ngExample && (
                        <div className="mt-2 rounded-lg bg-rose-50 p-2 ring-1 ring-rose-100 dark:bg-rose-950 dark:ring-rose-900">
                          <p className="text-slate-700 dark:text-slate-200"><span className="font-semibold text-rose-800 dark:text-rose-300">NG例と改善：</span>{e.ngExample}</p>
                        </div>
                      )}
                      {e.tags && e.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.tags.map((tg) => (
                            <span key={tg} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{tg}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">該当する論点がありません。</p>
      )}
    </section>
  );
}
