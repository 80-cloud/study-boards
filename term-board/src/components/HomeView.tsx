type Target = "quiz" | "card" | "dictionary" | "learn" | "interview" | "mock" | "guide" | "dashboard" | "review" | "prep" | "author" | "reverseq";

type Props = { onNavigate: (view: Target) => void };

type Mode = { key: Target; title: string; desc: string };

// グループ別アクセント色（CSS 変数で light/dark を自動切替）。
type GroupAccent = "memorize" | "interview" | "learn" | "author";
const ACCENT_VAR: Record<GroupAccent, string> = {
  memorize: "var(--color-accent-memorize)",
  interview: "var(--color-accent-interview)",
  learn: "var(--color-accent-learn)",
  author: "var(--color-accent-author)",
};

// ナビ（App.tsx の NAV_GROUPS）と同じ4グループで整理し、一貫した導線にする。
const MODE_GROUPS: { label: string; accent: GroupAccent; modes: Mode[] }[] = [
  {
    label: "覚える",
    accent: "memorize",
    modes: [
      { key: "quiz", title: "4択クイズ", desc: "用語の意味を4択で。即採点＋解説で定着させる。" },
      { key: "card", title: "暗記カード", desc: "表に用語、裏に意味。タップで裏返してサクッと暗記。" },
      { key: "dictionary", title: "用語辞典", desc: "IT用語の意味を引く・覚える。検索・分野・レベル・あいうえお順。" },
    ],
  },
  {
    label: "面接対策",
    accent: "interview",
    modes: [
      { key: "interview", title: "面接練習", desc: "面接の質問（志望動機・技術など）に声で答え、模範回答・型・NG例で確認。" },
      { key: "mock", title: "模擬面接", desc: "用語の説明を30秒で。模範解答と並べて3観点で自己採点。" },
      { key: "guide", title: "解説集", desc: "面接で訊かれる質問（論点）と模範解答を分類別に一覧。" },
      { key: "reverseq", title: "逆質問", desc: "「最後に質問は？」に備えて逆質問を貯める。いつでも編集。" },
    ],
  },
  {
    label: "学ぶ・記録",
    accent: "learn",
    modes: [
      { key: "learn", title: "学ぶ", desc: "学習ロードマップ・職種解説・図解で全体像をつかむ。" },
      { key: "dashboard", title: "ダッシュボード", desc: "正答率・苦手・連続学習を可視化。次の一手が分かる。" },
      { key: "review", title: "振り返り", desc: "今日のメモと、日々の学習を時系列で振り返る。" },
      { key: "prep", title: "自己PR", desc: "自己紹介・志望動機を穴埋めで下書き作成。" },
    ],
  },
  {
    label: "マイ問題",
    accent: "author",
    modes: [
      { key: "author", title: "マイ問題", desc: "自分で問題を作り、共有コードで配布・取り込み。" },
    ],
  },
];

// B7: トップページ（アプリ紹介・各モードへの入口）。
export function HomeView({ onNavigate }: Props) {
  return (
    <section className="flex flex-col gap-4">
      {/* ヒーロー＋FLOW: PC(lg+) は横並びにして縦スクロールを抑え、機能カードを上に引き上げる。 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ヒーロー */}
        <div className="rounded-card bg-gradient-to-br from-sky-700 to-sky-900 p-5 text-white shadow-sm lg:col-span-2">
          <p className="hig-kicker text-sky-200/90">term-board</p>
          <h2 className="hig-display mt-1 text-xl text-white sm:text-2xl">IT用語を「面接で言える」まで。</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-50/95">
            IT業界へ初めて転職する人のための学習アプリ。4択で覚えて、面接で自分の言葉にする。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("quiz")}
              className="rounded-control bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
            >
              今すぐ4択を始める
            </button>
            <button
              type="button"
              onClick={() => onNavigate("learn")}
              className="rounded-control px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/70 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
            >
              学習ロードマップを見る
            </button>
          </div>
        </div>

        {/* 使い方の流れ */}
        <div className="hig-card p-4">
          <p className="hig-kicker">FLOW</p>
          <h2 className="hig-display mt-0.5 text-sm font-semibold text-label">おすすめの進め方</h2>
          <ol className="mt-2 flex flex-col gap-1 text-sm text-label">
            <li className="font-medium">① 学ぶ（全体像）</li>
            <li className="font-medium">② 4択で定着</li>
            <li className="font-medium">③ 面接練習で言える</li>
            <li className="font-medium">④ 自己PRを整える</li>
          </ol>
        </div>
      </div>

      {/* モード一覧（ナビと同じ4グループで整理）。
          PC(lg+) は 4 グループ = 4 列のカンバン、タブレットは 1 列に sm:2 列、モバイルは 1 列。 */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="hig-kicker">MODES</p>
          <h2 className="hig-display mt-1 text-base font-semibold text-label">機能から選ぶ</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-5">
          {MODE_GROUPS.map((group) => {
            const accentVar = ACCENT_VAR[group.accent];
            return (
              <div key={group.label} className="flex flex-col gap-3">
                <h3
                  className="hig-kicker flex items-center gap-2"
                  style={{ color: accentVar }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: accentVar }}
                  />
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {group.modes.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => onNavigate(m.key)}
                      className="hig-card hig-card-accent p-4 pl-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]"
                      style={{ ["--accent-color" as string]: accentVar }}
                    >
                      <p className="font-semibold text-label">{m.title}</p>
                      <p className="mt-1 text-sm text-label-2">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
