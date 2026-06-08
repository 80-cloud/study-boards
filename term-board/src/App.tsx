import { useQuiz } from "./hooks/useQuiz";
import { useUserContent } from "./hooks/useUserContent";
import { usePendingImport } from "./hooks/usePendingImport";
import type { PendingImport } from "./hooks/usePendingImport";
import { useBookmarks } from "./hooks/useBookmarks";
import { useTheme } from "./hooks/useTheme";
import { useLevel } from "./hooks/useLevel";
import { useNavLayout } from "./hooks/useNavLayout";
import type { NavLayout } from "./hooks/useNavLayout";
import { useViewHistory } from "./hooks/useViewHistory";
import { CategoryFilter } from "./components/CategoryFilter";
import { LevelSelector } from "./components/LevelSelector";
import { QuizView } from "./components/QuizView";
import { InterviewView } from "./components/InterviewView";
import { MockInterviewView } from "./components/MockInterviewView";
import { CardView } from "./components/CardView";
import { ReviewView } from "./components/ReviewView";
import { GuideView } from "./components/GuideView";
import { ReverseQuestionStock } from "./components/ReverseQuestionStock";
import { AuthorView } from "./components/AuthorView";
import { DictionaryView } from "./components/DictionaryView";
import { DashboardView } from "./components/DashboardView";
import { PrepView } from "./components/PrepView";
import { LearnView } from "./components/LearnView";
import { HomeView } from "./components/HomeView";
import { StudyProgressPanel } from "./components/SidePanels";

// 全ビューの列挙（useViewHistory に渡してURLハッシュで履歴同期する・#387）。
const VIEWS = [
  "home",
  "quiz",
  "card",
  "dictionary",
  "interview",
  "mock",
  "guide",
  "author",
  "reverseq",
  "dashboard",
  "review",
  "prep",
  "learn",
] as const;
type View = (typeof VIEWS)[number];

// ナビのグループ定義（モバイルUX：13タブを4グループに集約）。
// View ユニオンは維持し、ナビUIのみ2段構成にする。
type NavGroup = {
  key: string;
  label: string;
  views: { view: Exclude<View, "home">; label: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: "memorize",
    label: "覚える",
    views: [
      { view: "quiz", label: "4択クイズ" },
      { view: "card", label: "暗記カード" },
      { view: "dictionary", label: "用語辞典" },
    ],
  },
  {
    key: "interview",
    label: "面接対策",
    views: [
      { view: "interview", label: "面接練習" },
      { view: "mock", label: "模擬面接" },
      { view: "guide", label: "解説集" },
      { view: "reverseq", label: "逆質問" },
    ],
  },
  {
    key: "learn",
    label: "学ぶ・記録",
    views: [
      { view: "learn", label: "学ぶ" },
      { view: "dashboard", label: "ダッシュボード" },
      { view: "review", label: "振り返り" },
      { view: "prep", label: "自己PR" },
    ],
  },
  {
    key: "mine",
    label: "マイ問題",
    views: [{ view: "author", label: "マイ問題" }],
  },
];

export default function App() {
  const [view, setView] = useViewHistory(VIEWS, "home");
  const theme = useTheme();
  const nav = useNavLayout();
  const user = useUserContent();
  const bookmarks = useBookmarks();
  // #431: ?import=... を踏んで開いた場合のプレビュー（受信側のワンクリック共有）
  const pendingImport = usePendingImport();
  // #437: 覚える系3ビュー共通の学習レベルフィルタ
  const levelState = useLevel();
  // ユーザー作問の件数を渡し、追加・取り込みで出題に即反映する（F-USER）。
  // #437: 学習レベルでも出題プールを絞れるよう level を引き渡す。
  const quiz = useQuiz(user.content.quizTerms.length, levelState.level);
  const rate =
    quiz.answeredCount > 0
      ? Math.round((quiz.correctCount / quiz.answeredCount) * 100)
      : 0;

  // 現在のビューが属するグループ（home のときは未選択）。
  const activeGroup = NAV_GROUPS.find((g) => g.views.some((v) => v.view === view));

  const sidebar = nav.layout === "sidebar";

  // ビュー本体（レイアウトに依存しないので切り出して両レイアウトで共有する）。
  const viewContent = (
    <>
      {view === "home" && <HomeView onNavigate={(v) => setView(v)} />}

      {view === "quiz" && (
        <>
          {quiz.status === "loading" && <p className="text-center text-label-2">読み込み中…</p>}
          {quiz.status === "error" && (
            <p className="rounded-control bg-rose-50 p-4 text-center text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900">
              用語データを読み込めませんでした。
            </p>
          )}
          {quiz.status === "ready" && (
            <>
              {/* #437: 学習レベル選択（解答数バーの上に配置）。 */}
              <div className="mb-3">
                <LevelSelector value={levelState.level} onChange={levelState.setLevel} />
              </div>
              {/* 出題範囲：タグ（AWS 等）・出どころ（自作のみ/既定のみ）で絞る。 */}
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {quiz.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="quiz-tag" className="text-sm font-medium text-label-2">タグ</label>
                    <select
                      id="quiz-tag"
                      value={quiz.tag}
                      onChange={(e) => quiz.setTag(e.target.value)}
                      className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <option value="">すべて</option>
                      {quiz.tags.map((tg) => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label htmlFor="quiz-source" className="text-sm font-medium text-label-2">出どころ</label>
                  <select
                    id="quiz-source"
                    value={quiz.source}
                    onChange={(e) => quiz.setSource(e.target.value as "all" | "user" | "builtin")}
                    className="rounded-control border border-separator bg-surface px-2 py-1.5 text-sm text-label focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="all">すべて</option>
                    <option value="user">自作のみ</option>
                    <option value="builtin">既定のみ</option>
                  </select>
                </div>
              </div>
              <div className="hig-card mb-5 flex items-center justify-between gap-4 px-4 py-3 text-sm lg:justify-center lg:gap-12">
                <span className="text-label-2">解答数 <span className="font-bold text-label">{quiz.answeredCount}</span></span>
                <span className="text-label-2">正答 <span className="font-bold text-emerald-700 dark:text-emerald-400">{quiz.correctCount}</span></span>
                <span className="text-label-2">正答率 <span className="font-bold text-accent">{rate}%</span></span>
              </div>
              {quiz.question ? (
                <QuizView
                  question={quiz.question}
                  selected={quiz.selected}
                  isCorrect={quiz.isCorrect}
                  onAnswer={quiz.answer}
                  onNext={quiz.next}
                />
              ) : (
                <p className="text-center text-label-2">この条件（分野・レベル・タグ・出どころ）では出題できる用語がありません。</p>
              )}
            </>
          )}
        </>
      )}

      {view === "card" && (
        <>
          {/* #437: 学習レベル選択（カード上部に配置・分野フィルタの上で見つけやすく） */}
          <div className="mb-3">
            <LevelSelector value={levelState.level} onChange={levelState.setLevel} />
          </div>
          <CardView level={levelState.level} />
          {/* #519: 暗記カードの学習サポート（進捗・苦手）はカードの「下」に配置。
              横サイドパネル案は読みづらく却下されたため下配置に。
              モバイルでも表示（縦積み）／PC は3枚を横並び。 */}
          <div className="mt-6">
            <StudyProgressPanel layout="row" />
          </div>
        </>
      )}
      {view === "dictionary" && (
        <>
          {/* #437: 学習レベル選択（辞典上部に配置） */}
          <div className="mb-3">
            <LevelSelector value={levelState.level} onChange={levelState.setLevel} />
          </div>
          <DictionaryView bookmarks={bookmarks} level={levelState.level} />
        </>
      )}
      {view === "learn" && <LearnView />}
      {view === "dashboard" && <DashboardView bookmarks={bookmarks} />}
      {view === "review" && <ReviewView />}
      {view === "prep" && <PrepView />}
      {view === "interview" && <InterviewView userQuestions={user.content.interviewQuestions} />}
      {view === "mock" && <MockInterviewView />}
      {view === "guide" && <GuideView userQuestions={user.content.interviewQuestions} />}
      {view === "author" && <AuthorView user={user} />}
      {view === "reverseq" && <ReverseQuestionStock user={user} />}
    </>
  );

  // PC で横幅を活かすビュー：ホーム（4列カンバン）・4択クイズ（質問＝左／解説＝右の2カラム）・
  // 暗記カード（余白を抑えてカードを大きく見せる）・用語辞典（2カラムでスクロールを短縮）。
  // 他ビュー（面接練習など）は本文の可読幅を優先して従来の max-w-2xl を維持。
  const mainWidth =
    view === "home" ? "max-w-6xl"
    : view === "quiz" ? "max-w-5xl"
    : view === "card" ? "max-w-4xl"
    : view === "dictionary" ? "max-w-5xl"
    : view === "interview" ? "max-w-5xl"
    : "max-w-2xl";
  // ヘッダーはビュー切替で幅が動くと違和感が出るため、常に広い幅で固定。
  const headerWidth = sidebar ? "max-w-5xl" : "max-w-6xl";

  return (
    <div className="min-h-screen bg-canvas text-label">
      {/* iOS/macOS のナビバー風：上部固定・半透明 + backdrop blur（素材感）。 */}
      <header className="sticky top-0 z-20 border-b border-separator bg-bar backdrop-blur-xl backdrop-saturate-150">
        <div className={`mx-auto flex flex-col gap-3 px-4 py-3 ${headerWidth}`}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-[17px] font-semibold tracking-tight">
                  <button
                    type="button"
                    onClick={() => setView("home")}
                    aria-label="IT用語ボード（ホームへ戻る）"
                    title="ホームへ戻る"
                    className="rounded transition hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    IT用語ボード
                  </button>
                </h1>
                <p className="text-xs text-label-2">面接で言えるまで、4択で定着させる</p>
              </div>
              <ThemeToggle theme={theme.theme} onToggle={theme.toggle} className="flex sm:hidden" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {view === "quiz" && quiz.status === "ready" && (
                <CategoryFilter
                  categories={quiz.categories}
                  value={quiz.category}
                  onChange={quiz.setCategory}
                />
              )}
              {/* PCナビ様式トグル（desktop のみ・#381 の2案比較用）。 */}
              <LayoutToggle layout={nav.layout} onToggle={nav.toggle} className="hidden lg:flex" />
              <ThemeToggle theme={theme.theme} onToggle={theme.toggle} className="hidden sm:flex" />
            </div>
          </div>

          {/* 上部ナビ（セグメント＋ピル）。toolbar は常時／sidebar は desktop でサイドバーに譲りモバイルのみ表示。 */}
          <div className={`flex flex-col gap-3 ${sidebar ? "lg:hidden" : ""}`}>
            <TopNav view={view} activeGroup={activeGroup} setView={setView} />
          </div>
        </div>
      </header>

      {/* #431: URL 取り込みバナー（明示操作で取り込む・コンテンツの上に出す） */}
      {pendingImport.pending && (
        <div className={`mx-auto ${mainWidth} px-4 pt-4`}>
          <PendingImportBanner
            pending={pendingImport.pending}
            onAccept={() => {
              user.importCode(pendingImport.pending!.code);
              pendingImport.clear();
              setView("author");
            }}
            onDismiss={() => pendingImport.clear()}
          />
        </div>
      )}

      {sidebar ? (
        <div className="mx-auto flex w-full max-w-5xl gap-6 px-4 py-6">
          <main className="min-w-0 flex-1">
            <div className={`mx-auto ${mainWidth}`}>{viewContent}</div>
          </main>
          {/* サイドバーは右側に配置（#383）。 */}
          <SideNav view={view} setView={setView} className="hidden w-56 shrink-0 lg:block" />
        </div>
      ) : (
        <main className={`mx-auto ${mainWidth} px-4 py-6`}>{viewContent}</main>
      )}
    </div>
  );
}

// #431: 取り込み確認バナー。?import=... で開いた時だけ表示される。
function PendingImportBanner({
  pending,
  onAccept,
  onDismiss,
}: {
  pending: PendingImport;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const { quiz, interview, reverse, flashcard } = pending.preview;
  const total = quiz + interview + reverse + flashcard;
  const summary = [
    quiz > 0 ? `4択用語 ${quiz}件` : "",
    interview > 0 ? `面接Q&A ${interview}件` : "",
    flashcard > 0 ? `暗記カード ${flashcard}件` : "",
    reverse > 0 ? `逆質問 ${reverse}件` : "",
  ]
    .filter(Boolean)
    .join("・");
  return (
    <div
      role="dialog"
      aria-label="共有コードの取り込み確認"
      className="hig-card flex flex-col gap-3 p-4 ring-1 ring-accent/40 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-label">共有コードが届いています</p>
        <p className="mt-0.5 text-sm text-label-2">
          {total > 0 ? summary : "内容を確認できませんでした"}
          を取り込みます。既存の内容には影響しません（追記のみ）。
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="hig-btn-primary px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          取り込む
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-control bg-fill-quaternary px-4 py-2 text-sm font-semibold text-label transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// 上部ナビ：第1段＝iOS セグメント、第2段＝モードのピル列。
function TopNav({
  view,
  activeGroup,
  setView,
}: {
  view: View;
  activeGroup: NavGroup | undefined;
  setView: (v: View) => void;
}) {
  return (
    <>
      <nav className="flex gap-1 rounded-control bg-fill-quaternary p-1" aria-label="カテゴリ切替">
        {NAV_GROUPS.map((g) => (
          <SegmentTab key={g.key} active={activeGroup?.key === g.key} onClick={() => setView(g.views[0].view)}>
            {g.label}
          </SegmentTab>
        ))}
      </nav>
      {activeGroup && activeGroup.views.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label={`${activeGroup.label}のモード切替`}>
          {activeGroup.views.map((v) => (
            <PillTab key={v.view} active={view === v.view} onClick={() => setView(v.view)}>
              {v.label}
            </PillTab>
          ))}
        </nav>
      )}
    </>
  );
}

// 左サイドバー（macOS のソースリスト風）。グループ見出し＋モード行。desktop 専用。
function SideNav({
  view,
  setView,
  className = "",
}: {
  view: View;
  setView: (v: View) => void;
  className?: string;
}) {
  return (
    <nav className={`flex flex-col gap-1 self-start ${className}`} aria-label="モード一覧">
      <SideRow active={view === "home"} onClick={() => setView("home")}>ホーム</SideRow>
      {NAV_GROUPS.map((g) => (
        <div key={g.key} className="mt-3 first:mt-0">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-label-2">{g.label}</p>
          {g.views.map((v) => (
            <SideRow key={v.view} active={view === v.view} onClick={() => setView(v.view)}>
              {v.label}
            </SideRow>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SideRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full rounded-control px-3 py-1.5 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "bg-accent-fill text-white" : "text-label hover:bg-fill-quaternary"
      }`}
    >
      {children}
    </button>
  );
}

// PCナビ様式の切替（上部ツールバー ⇄ サイドバー）。desktop のみ表示。
function LayoutToggle({
  layout,
  onToggle,
  className = "",
}: {
  layout: NavLayout;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={layout === "sidebar" ? "サイドバー表示中。クリックで上部ツールバーに切り替え" : "ツールバー表示中。クリックでサイドバーに切り替え"}
      title={layout === "sidebar" ? "サイドバー表示中（クリックで上部ツールバー）" : "上部ツールバー表示中（クリックでサイドバー）"}
      className={`h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-label-2 ring-1 ring-separator transition hover:bg-fill-quaternary hover:text-label focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <span aria-hidden="true">{layout === "sidebar" ? "◧" : "▤"}</span>
      {layout === "sidebar" ? "サイドバー" : "ツールバー"}
    </button>
  );
}

// iOS セグメントコントロールの 1 セグメント。選択中は白ピルが浮き上がる。
function SegmentTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex-1 rounded-[7px] px-2 py-1.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "bg-surface text-label shadow-sm" : "text-label-2 hover:text-label"
      }`}
    >
      {children}
    </button>
  );
}

// 第2段のモード切替ピル。選択中は systemBlue 塗り。
function PillTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active
          ? "bg-accent-fill text-white"
          : "bg-surface text-label-2 ring-1 ring-separator hover:text-label"
      }`}
    >
      {children}
    </button>
  );
}

// テーマ切替（iOS/macOS のツールバーボタン風・丸角）。
function ThemeToggle({
  theme,
  onToggle,
  className = "",
}: {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className={`h-8 w-8 items-center justify-center rounded-full text-base ring-1 ring-separator transition hover:bg-fill-quaternary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
