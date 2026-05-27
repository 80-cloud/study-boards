import { useEffect, useMemo, useState } from "react";
import type { InterviewQuestion, Term } from "../types";
import { repository } from "../api";
import bundledQuestions from "../data/interviewQuestions.json";

type Props = {
  // ユーザー作問の面接Q&A（F-USER）。
  userQuestions: InterviewQuestion[];
};

const bundled = bundledQuestions as InterviewQuestion[];

// 解説集の1行（論点＋分類＋解説）。質問(面接Q&A)・用語(模擬面接)を統一して扱う。
type Entry = {
  id: string;
  ronten: string; // 論点（クリック前に見える見出し）
  category: string; // 分類
  answer?: string; // 模範回答／面接での言い方
  meaning?: string; // 用語の意味
  template?: string; // 回答の型
  ngExample?: string; // NG例と改善
  scene?: string; // 現場では
  followUps?: { q: string; a: string }[]; // 深掘り
};

// 分類の表示順（面接Q&A系を先、用語の分野を後に）。未定義は末尾。
const CATEGORY_ORDER = [
  "志望動機", "自己PR", "行動面接", "技術質問", "逆質問",
  "Web基礎", "ネットワーク", "セキュリティ", "データベース",
  "アーキテクチャ", "インフラ", "フロントエンド", "開発手法", "テスト",
];

// B6+: 解説集（論点×分類×解説の一覧）。過去問道場の論点一覧に着想。
export function GuideView({ userQuestions }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
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

  // 面接Q&A（同梱＋ユーザー作問）と用語を統一エントリ化する。
  const entries = useMemo<Entry[]>(() => {
    const qa: Entry[] = [...bundled, ...userQuestions].map((q) => ({
      id: `qa-${q.id}`,
      ronten: q.question,
      category: q.category,
      answer: q.answer,
      template: q.template,
      ngExample: q.ngExample,
    }));
    const termEntries: Entry[] = terms.map((t) => ({
      id: `term-${t.id}`,
      ronten: `「${t.term}」とは？`,
      category: t.category,
      answer: t.interview,
      meaning: t.meaning,
      scene: t.scene,
      followUps: t.followUps,
    }));
    return [...qa, ...termEntries];
  }, [terms, userQuestions]);

  const categories = useMemo(() => {
    const set = [...new Set(entries.map((e) => e.category))];
    return set.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category && e.category !== category) return false;
      if (q && !`${e.ronten} ${e.answer ?? ""} ${e.meaning ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, category]);

  // 分類ごとにグルーピング（表示順に沿って）。
  const groups = useMemo(() => {
    return categories
      .map((cat) => ({ category: cat, rows: filtered.filter((e) => e.category === cat) }))
      .filter((g) => g.rows.length > 0);
  }, [categories, filtered]);

  return (
    <section className="flex flex-col gap-4">
      {/* 検索・分類フィルタ */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div>
          <label htmlFor="guide-search" className="sr-only">論点を検索</label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="論点・解説で検索"
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
          {/* 分類セクション見出し */}
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
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{e.ronten}</span>
                    <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">{e.category}</span>
                    <span aria-hidden="true" className="shrink-0 text-sm text-slate-400">{open ? "−" : "＋"}</span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-3 py-3 text-sm leading-relaxed dark:border-slate-700">
                      {e.meaning && (
                        <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">意味：</span>{e.meaning}</p>
                      )}
                      {e.answer && (
                        <p className="mt-1 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{e.meaning ? "面接での言い方：" : "模範回答："}</span>{e.answer}
                        </p>
                      )}
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
                      {e.scene && (
                        <p className="mt-2 text-slate-600 dark:text-slate-400"><span className="font-semibold text-slate-800 dark:text-slate-200">現場では：</span>{e.scene}</p>
                      )}
                      {e.followUps && e.followUps.length > 0 && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 ring-1 ring-amber-100 dark:bg-amber-950 dark:ring-amber-900">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">深掘り：</p>
                          <ul className="mt-1 flex flex-col gap-1">
                            {e.followUps.map((f, i) => (
                              <li key={i} className="text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">Q. {f.q}</span> A. {f.a}
                              </li>
                            ))}
                          </ul>
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
