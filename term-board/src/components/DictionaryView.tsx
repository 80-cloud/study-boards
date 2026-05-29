import { useEffect, useMemo, useState } from "react";
import type { Term } from "../types";
import { repository } from "../api";
import type { UseBookmarks } from "../hooks/useBookmarks";
import type { LevelFilter } from "../hooks/useLevel";

type Props = { bookmarks: UseBookmarks; level: LevelFilter };

const levelClass: Record<string, string> = {
  初級: "bg-emerald-100 text-emerald-800",
  中級: "bg-amber-100 text-amber-800",
  上級: "bg-rose-100 text-rose-800",
};

// B1: 用語辞典（IT用語辞典・カテゴリ別・検索・ブックマーク・レベル表示／レベル絞り#437）。
export function DictionaryView({ bookmarks, level }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("default");
  // #397: 複数項目を同時に展開できるよう Set で管理する（旧来の単一 openId からの拡張）。
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const isOpen = (id: string) => openIds.has(id);
  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      // #437 + #444: level 未設定（ユーザー作問など）は全レベル該当として残す
      if (level !== "all" && t.level && t.level !== level) return false;
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
  }, [terms, query, category, level, onlyBookmarked, bookmarks, sort]);

  return (
    <section className="flex flex-col gap-4">
      <div className="hig-card flex flex-col gap-3 p-4">
        <div>
          <label htmlFor="dict-search" className="sr-only">用語を検索</label>
          <input
            id="dict-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="用語・意味で検索"
            className="w-full rounded-control border border-separator bg-surface px-3 py-2 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dict-cat" className="text-sm font-medium text-label-2">分野</label>
            <select
              id="dict-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">すべて</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dict-sort" className="text-sm font-medium text-label-2">並び替え</label>
            <select
              id="dict-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as "default" | "asc" | "desc")}
              className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="default">標準（分野順）</option>
              <option value="asc">あいうえお順</option>
              <option value="desc">あいうえお順（逆）</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-label-2">
            <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} className="h-4 w-4" />
            ★ブックマークのみ（{bookmarks.count}）
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-label-2">{filtered.length} 件</p>
        {filtered.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpenIds(new Set(filtered.map((t) => t.id)))}
              className="rounded-control px-2 py-1 text-xs font-medium text-accent ring-1 ring-separator transition hover:bg-fill-quaternary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              すべて開く
            </button>
            <button
              type="button"
              onClick={() => setOpenIds(new Set())}
              className="rounded-control px-2 py-1 text-xs font-medium text-label-2 ring-1 ring-separator transition hover:bg-fill-quaternary hover:text-label focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              すべて閉じる
            </button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((t) => {
          const open = isOpen(t.id);
          return (
            <li key={t.id} className="hig-card">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggleOpen(t.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="truncate font-semibold text-label">{t.term}</span>
                  {t.level && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${levelClass[t.level] ?? "bg-fill-quaternary text-label-2"}`}>
                      {t.level}
                    </span>
                  )}
                  {t.source === "shared" && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      もらった
                    </span>
                  )}
                  {t.source === "user" && (
                    <span className="shrink-0 rounded-full bg-fill-quaternary px-2 py-0.5 text-xs font-medium text-label">
                      自作
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-label-2">{t.category}</span>
                </button>
                <button
                  type="button"
                  onClick={() => bookmarks.toggle(t.id)}
                  aria-pressed={bookmarks.isBookmarked(t.id)}
                  aria-label={bookmarks.isBookmarked(t.id) ? `${t.term} のブックマークを外す` : `${t.term} をブックマーク`}
                  className="shrink-0 rounded-lg px-2 py-1 text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className={bookmarks.isBookmarked(t.id) ? "text-amber-500" : "text-label-3"}>★</span>
                </button>
              </div>
              {open && (
                <div className="border-t border-separator px-3 py-3 text-sm leading-relaxed">
                  {t.plainMeaning && (
                    <p className="text-label-2"><span className="font-semibold text-accent">かんたんに：</span>{t.plainMeaning}</p>
                  )}
                  <p className="mt-1 text-label-2"><span className="font-semibold text-label">意味：</span>{t.meaning}</p>
                  {t.scene && (
                    <p className="mt-1 text-label-2"><span className="font-semibold text-label">現場では：</span>{t.scene}</p>
                  )}
                  <p className="mt-1 text-label-2"><span className="font-semibold text-label">面接での言い方：</span>{t.interview}</p>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-center text-sm text-label-2">該当する用語がありません。</li>
        )}
      </ul>
    </section>
  );
}
