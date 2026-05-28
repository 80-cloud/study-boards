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
    <section className="hig-card p-5">
      <h2 className="text-sm font-semibold text-label">逆質問ストック</h2>
      <p className="mt-0.5 text-xs text-label-2">
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
          className="flex-1 rounded-control border border-separator bg-surface px-3 py-2 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          className="hig-btn-primary px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          追加
        </button>
      </form>

      {/* ストック一覧 */}
      {loaded && items.length === 0 ? (
        <p className="mt-3 text-sm text-label-2">まだありません。下の候補や自由入力から追加できます。</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((q) => (
            <li key={q} className="flex items-start justify-between gap-3 rounded-control bg-surface-2 px-3 py-2">
              <span className="text-sm text-label">{q}</span>
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
          <p className="text-xs font-medium text-label-2">候補から追加：</p>
          <div className="mt-2 flex flex-col gap-2">
            {availablePresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => add(p)}
                className="rounded-control border border-dashed border-separator px-3 py-2 text-left text-sm text-label-2 transition hover:border-accent hover:text-label focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
