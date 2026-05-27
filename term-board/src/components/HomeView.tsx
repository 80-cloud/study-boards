type Target = "quiz" | "dictionary" | "learn" | "interview" | "mock" | "dashboard" | "prep" | "author";

type Props = { onNavigate: (view: Target) => void };

const MODES: { key: Target; title: string; desc: string }[] = [
  { key: "quiz", title: "4択クイズ", desc: "用語の意味を4択で。即採点＋解説で定着させる。" },
  { key: "dictionary", title: "用語辞典", desc: "用語を検索・分野・レベルで探し、ブックマーク。" },
  { key: "learn", title: "学ぶ", desc: "学習ロードマップ・職種解説・図解で全体像をつかむ。" },
  { key: "interview", title: "面接練習", desc: "想定質問に声で答え、模範回答・型・NG例で確認。" },
  { key: "mock", title: "模擬面接", desc: "用語の説明を30秒で。模範解答と並べて自己評価する。" },
  { key: "dashboard", title: "ダッシュボード", desc: "正答率・苦手・連続学習を可視化。次の一手が分かる。" },
  { key: "prep", title: "自己PR", desc: "自己紹介・志望動機を穴埋めで下書き作成。" },
  { key: "author", title: "マイ問題", desc: "自分で問題を作り、共有コードで配布・取り込み。" },
];

// B7: トップページ（アプリ紹介・各モードへの入口）。
export function HomeView({ onNavigate }: Props) {
  return (
    <section className="flex flex-col gap-6">
      {/* ヒーロー */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 p-6 text-white shadow-sm">
        <h2 className="text-2xl font-bold">IT用語を「面接で言える」まで。</h2>
        <p className="mt-2 text-sm leading-relaxed text-sky-50">
          IT業界へ初めて転職する人のための学習アプリ。4択で覚えて、面接で自分の言葉にする。
          ログイン不要・無料・ブラウザだけで今すぐ。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("quiz")}
            className="rounded-xl bg-white px-5 py-2.5 font-semibold text-sky-800 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            今すぐ4択を始める
          </button>
          <button
            type="button"
            onClick={() => onNavigate("learn")}
            className="rounded-xl px-5 py-2.5 font-semibold text-white ring-1 ring-white/70 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
          >
            学習ロードマップを見る
          </button>
        </div>
      </div>

      {/* 使い方の流れ */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">おすすめの進め方</h2>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li className="font-medium">① 学ぶ（全体像）</li>
          <li aria-hidden="true" className="text-slate-400">→</li>
          <li className="font-medium">② 4択で定着</li>
          <li aria-hidden="true" className="text-slate-400">→</li>
          <li className="font-medium">③ 面接練習で言える</li>
          <li aria-hidden="true" className="text-slate-400">→</li>
          <li className="font-medium">④ 自己PRを整える</li>
        </ol>
      </div>

      {/* モード一覧 */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">機能から選ぶ</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onNavigate(m.key)}
              className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-800 dark:ring-slate-700 dark:hover:ring-sky-500"
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">{m.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
