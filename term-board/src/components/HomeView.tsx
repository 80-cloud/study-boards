type Target = "quiz" | "card" | "dictionary" | "learn" | "interview" | "mock" | "guide" | "dashboard" | "review" | "prep" | "author" | "reverseq";

type Props = { onNavigate: (view: Target) => void };

type Mode = { key: Target; title: string; desc: string };

// ナビ（App.tsx の NAV_GROUPS）と同じ4グループで整理し、一貫した導線にする。
const MODE_GROUPS: { label: string; modes: Mode[] }[] = [
  {
    label: "覚える",
    modes: [
      { key: "quiz", title: "4択クイズ", desc: "用語の意味を4択で。即採点＋解説で定着させる。" },
      { key: "card", title: "暗記カード", desc: "表に用語、裏に意味。タップで裏返してサクッと暗記。" },
      { key: "dictionary", title: "用語辞典", desc: "IT用語の意味を引く・覚える。検索・分野・レベル・あいうえお順。" },
    ],
  },
  {
    label: "面接対策",
    modes: [
      { key: "interview", title: "面接練習", desc: "面接の質問（志望動機・技術など）に声で答え、模範回答・型・NG例で確認。" },
      { key: "mock", title: "模擬面接", desc: "用語の説明を30秒で。模範解答と並べて3観点で自己採点。" },
      { key: "guide", title: "解説集", desc: "面接で訊かれる質問（論点）と模範解答を分類別に一覧。" },
      { key: "reverseq", title: "逆質問", desc: "「最後に質問は？」に備えて逆質問を貯める。いつでも編集。" },
    ],
  },
  {
    label: "学ぶ・記録",
    modes: [
      { key: "learn", title: "学ぶ", desc: "学習ロードマップ・職種解説・図解で全体像をつかむ。" },
      { key: "dashboard", title: "ダッシュボード", desc: "正答率・苦手・連続学習を可視化。次の一手が分かる。" },
      { key: "review", title: "振り返り", desc: "今日のメモと、日々の学習を時系列で振り返る。" },
      { key: "prep", title: "自己PR", desc: "自己紹介・志望動機を穴埋めで下書き作成。" },
    ],
  },
  {
    label: "マイ問題",
    modes: [
      { key: "author", title: "マイ問題", desc: "自分で問題を作り、共有コードで配布・取り込み。" },
    ],
  },
];

// B7: トップページ（アプリ紹介・各モードへの入口）。
export function HomeView({ onNavigate }: Props) {
  return (
    <section className="flex flex-col gap-6">
      {/* ヒーロー：Display 書体＋kicker で「華」を出す（#399） */}
      <div className="rounded-card bg-gradient-to-br from-sky-700 to-sky-900 p-8 text-white shadow-sm">
        <p className="hig-kicker text-sky-200/90">term-board</p>
        <h2 className="hig-display mt-2 text-2xl text-white sm:text-3xl">IT用語を「面接で言える」まで。</h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-sky-50/95">
          IT業界へ初めて転職する人のための学習アプリ。4択で覚えて、面接で自分の言葉にする。
          ログイン不要・無料・ブラウザだけで今すぐ。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("quiz")}
            className="rounded-control bg-white px-5 py-2.5 font-semibold text-sky-800 transition hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
          >
            今すぐ4択を始める
          </button>
          <button
            type="button"
            onClick={() => onNavigate("learn")}
            className="rounded-control px-5 py-2.5 font-semibold text-white ring-1 ring-white/70 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
          >
            学習ロードマップを見る
          </button>
        </div>
      </div>

      {/* 使い方の流れ */}
      <div className="hig-card p-6">
        <p className="hig-kicker">FLOW</p>
        <h2 className="hig-display mt-1 text-base font-semibold text-label">おすすめの進め方</h2>
        <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-label">
          <li className="font-medium">① 学ぶ（全体像）</li>
          <li aria-hidden="true" className="text-label-3">→</li>
          <li className="font-medium">② 4択で定着</li>
          <li aria-hidden="true" className="text-label-3">→</li>
          <li className="font-medium">③ 面接練習で言える</li>
          <li aria-hidden="true" className="text-label-3">→</li>
          <li className="font-medium">④ 自己PRを整える</li>
        </ol>
      </div>

      {/* モード一覧（ナビと同じ4グループで整理） */}
      <div className="flex flex-col gap-6">
        <div>
          <p className="hig-kicker">MODES</p>
          <h2 className="hig-display mt-1 text-base font-semibold text-label">機能から選ぶ</h2>
        </div>
        {MODE_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="hig-kicker mb-3">
              {group.label}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.modes.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onNavigate(m.key)}
                  className="hig-card p-4 text-left transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]"
                >
                  <p className="font-semibold text-label">{m.title}</p>
                  <p className="mt-1 text-sm text-label-2">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
