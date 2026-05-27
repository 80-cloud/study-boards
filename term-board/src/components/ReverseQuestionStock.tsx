import { useEffect, useState } from "react";
import { repository } from "../api";

// F-INTV-07: 逆質問ストック。面接終盤の「最後に何か質問は？」に備えて貯める。
// プリセット候補からの追加・自由入力・削除に対応し、localStorage に保存する。

const PRESETS = [
  "入社後、最初の3か月で期待される役割は何ですか？",
  "未経験から活躍されている方は、どんな学び方をしていますか？",
  "チームのコードレビューやペア作業の進め方を教えてください。",
  "使用している技術スタックと、今後変えていきたい部分はありますか？",
  "評価制度やキャリアの伸ばし方について教えてください。",
];

export function ReverseQuestionStock() {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    repository.getReverseQuestions().then((qs) => {
      if (!active) return;
      setItems(qs);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const persist = (next: string[]) => {
    setItems(next);
    void repository.saveReverseQuestions(next);
  };

  const add = (q: string) => {
    const v = q.trim();
    if (!v || items.includes(v)) return;
    persist([...items, v]);
  };

  const remove = (q: string) => persist(items.filter((x) => x !== q));

  const availablePresets = PRESETS.filter((p) => !items.includes(p));

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">逆質問ストック</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        「最後に何か質問は？」に備えて、聞きたいことを貯めておきましょう。
      </p>

      {/* 自由入力で追加 */}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="自分の逆質問を追加…"
          aria-label="逆質問を入力"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          追加
        </button>
      </form>

      {/* ストック一覧 */}
      {loaded && items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">まだありません。下の候補や自由入力から追加できます。</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((q) => (
            <li key={q} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
              <span className="text-sm text-slate-800 dark:text-slate-200">{q}</span>
              <button
                type="button"
                onClick={() => remove(q)}
                aria-label={`「${q}」を削除`}
                className="shrink-0 rounded-md px-2 py-0.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* プリセット候補 */}
      {availablePresets.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">候補から追加：</p>
          <div className="mt-2 flex flex-col gap-2">
            {availablePresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => add(p)}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-slate-700"
              >
                ＋ {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
