import { useState } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { useUserContent } from "./hooks/useUserContent";
import { useBookmarks } from "./hooks/useBookmarks";
import { useTheme } from "./hooks/useTheme";
import { CategoryFilter } from "./components/CategoryFilter";
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

type View = "home" | "quiz" | "card" | "dictionary" | "interview" | "mock" | "guide" | "author" | "reverseq" | "dashboard" | "review" | "prep" | "learn";

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
  const [view, setView] = useState<View>("home");
  const theme = useTheme();
  const user = useUserContent();
  const bookmarks = useBookmarks();
  // ユーザー作問の件数を渡し、追加・取り込みで出題に即反映する（F-USER）。
  const quiz = useQuiz(user.content.quizTerms.length);
  const rate =
    quiz.answeredCount > 0
      ? Math.round((quiz.correctCount / quiz.answeredCount) * 100)
      : 0;

  // 現在のビューが属するグループ（home のときは未選択）。
  const activeGroup = NAV_GROUPS.find((g) => g.views.some((v) => v.view === view));

  return (
    <div className="min-h-screen bg-canvas text-label">
      {/* iOS/macOS のナビバー風：上部固定・半透明 + backdrop blur（素材感）。 */}
      <header className="sticky top-0 z-20 border-b border-separator bg-bar backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3">
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
            <div className="flex items-center gap-2">
              {view === "quiz" && quiz.status === "ready" && (
                <CategoryFilter
                  categories={quiz.categories}
                  value={quiz.category}
                  onChange={quiz.setCategory}
                />
              )}
              <ThemeToggle theme={theme.theme} onToggle={theme.toggle} className="hidden sm:flex" />
            </div>
          </div>

          {/* 第1段：グループ。iOS のセグメントコントロール（薄い面に白ピルが滑る）。 */}
          <nav
            className="flex gap-1 rounded-control bg-fill-quaternary p-1"
            aria-label="カテゴリ切替"
          >
            {NAV_GROUPS.map((g) => (
              <SegmentTab
                key={g.key}
                active={activeGroup?.key === g.key}
                onClick={() => setView(g.views[0].view)}
              >
                {g.label}
              </SegmentTab>
            ))}
          </nav>

          {/* 第2段：選択中グループのモード（単独グループは第1段で完結するため省略）。ピル列。 */}
          {activeGroup && activeGroup.views.length > 1 && (
            <nav
              className="flex flex-wrap gap-2"
              aria-label={`${activeGroup.label}のモード切替`}
            >
              {activeGroup.views.map((v) => (
                <PillTab
                  key={v.view}
                  active={view === v.view}
                  onClick={() => setView(v.view)}
                >
                  {v.label}
                </PillTab>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
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
                <div className="hig-card mb-5 flex items-center justify-between px-4 py-3 text-sm">
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
                  <p className="text-center text-label-2">この分野には出題できる用語がありません。</p>
                )}
              </>
            )}
          </>
        )}

        {view === "card" && <CardView />}

        {view === "dictionary" && <DictionaryView bookmarks={bookmarks} />}

        {view === "learn" && <LearnView />}

        {view === "dashboard" && <DashboardView bookmarks={bookmarks} />}

        {view === "review" && <ReviewView />}

        {view === "prep" && <PrepView />}

        {view === "interview" && (
          <InterviewView userQuestions={user.content.interviewQuestions} />
        )}

        {view === "mock" && <MockInterviewView />}

        {view === "guide" && <GuideView userQuestions={user.content.interviewQuestions} />}

        {view === "author" && <AuthorView user={user} />}

        {view === "reverseq" && <ReverseQuestionStock />}
      </main>
    </div>
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
