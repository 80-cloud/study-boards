import { useEffect, useMemo, useState } from "react";
import type { Term } from "../types";
import { repository } from "../api";
import type { UseBookmarks } from "../hooks/useBookmarks";

type Props = { bookmarks: UseBookmarks };

const levelClass: Record<string, string> = {
  初級: "bg-emerald-100 text-emerald-800",
  中級: "bg-amber-100 text-amber-800",
  上級: "bg-rose-100 text-rose-800",
};

// B1: 用語辞典（IT用語辞典・カテゴリ別・検索・ブックマーク・レベル表示）。
export function DictionaryView({ bookmarks }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("default");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repository.getTerms().then((t) => {
      if (active) setTerms(t);
    });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(terms.map((t) => t.category))].sort(),
    [terms],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = terms.filter((t) => {
      if (category && t.category !== category) return false;
      if (onlyBookmarked && !bookmarks.isBookmarked(t.id)) return false;
      if (q && !`${t.term} ${t.meaning} ${t.plainMeaning ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    if (sort !== "default") {
      // あいうえお順（日本語照合）。英字・カタカナ・漢字も自然な順に並ぶ。
      const sorted = [...list].sort((a, b) => a.term.localeCompare(b.term, "ja"));
      return sort === "desc" ? sorted.reverse() : sorted;
    }
    return list;
  }, [terms, query, category, onlyBookmarked, bookmarks, sort]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div>
          <label htmlFor="dict-search" className="sr-only">用語を検索</label>
          <input
            id="dict-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="用語・意味で検索"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dict-cat" className="text-sm font-medium text-slate-600 dark:text-slate-300">分野</label>
            <select
              id="dict-cat"
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
          <div className="flex items-center gap-2">
            <label htmlFor="dict-sort" className="text-sm font-medium text-slate-600 dark:text-slate-300">並び替え</label>
            <select
              id="dict-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as "default" | "asc" | "desc")}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="default">標準（分野順）</option>
              <option value="asc">あいうえお順</option>
              <option value="desc">あいうえお順（逆）</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} className="h-4 w-4" />
            ★ブックマークのみ（{bookmarks.count}）
          </label>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">{filtered.length} 件</p>

      <ul className="flex flex-col gap-2">
        {filtered.map((t) => {
          const open = openId === t.id;
          return (
            <li key={t.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{t.term}</span>
                  {t.level && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${levelClass[t.level] ?? "bg-slate-100 text-slate-700"}`}>
                      {t.level}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{t.category}</span>
                </button>
                <button
                  type="button"
                  onClick={() => bookmarks.toggle(t.id)}
                  aria-pressed={bookmarks.isBookmarked(t.id)}
                  aria-label={bookmarks.isBookmarked(t.id) ? `${t.term} のブックマークを外す` : `${t.term} をブックマーク`}
                  className="shrink-0 rounded-lg px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <span className={bookmarks.isBookmarked(t.id) ? "text-amber-500" : "text-slate-400"}>★</span>
                </button>
              </div>
              {open && (
                <div className="border-t border-slate-100 px-3 py-3 text-sm leading-relaxed dark:border-slate-700">
                  {t.plainMeaning && (
                    <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-sky-800 dark:text-sky-300">かんたんに：</span>{t.plainMeaning}</p>
                  )}
                  <p className="mt-1 text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">意味：</span>{t.meaning}</p>
                  {t.scene && (
                    <p className="mt-1 text-slate-600 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">現場では：</span>{t.scene}</p>
                  )}
                  <p className="mt-1 text-slate-600 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">面接での言い方：</span>{t.interview}</p>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-center text-sm text-slate-600 dark:text-slate-400">該当する用語がありません。</li>
        )}
      </ul>
    </section>
  );
}
