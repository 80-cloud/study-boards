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
import { AuthorView } from "./components/AuthorView";
import { DictionaryView } from "./components/DictionaryView";
import { DashboardView } from "./components/DashboardView";
import { PrepView } from "./components/PrepView";
import { LearnView } from "./components/LearnView";
import { HomeView } from "./components/HomeView";

type View = "home" | "quiz" | "card" | "dictionary" | "interview" | "mock" | "guide" | "author" | "dashboard" | "review" | "prep" | "learn";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold">
                  <button
                    type="button"
                    onClick={() => setView("home")}
                    aria-label="IT用語ボード（ホームへ戻る）"
                    title="ホームへ戻る"
                    className="rounded transition hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:hover:text-sky-400"
                  >
                    IT用語ボード
                  </button>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">面接で言えるまで、4択で定着させる</p>
              </div>
              <button
                type="button"
                onClick={theme.toggle}
                aria-label={theme.theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
                className="rounded-lg px-2 py-1 text-lg ring-1 ring-slate-300 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:ring-slate-600 dark:hover:bg-slate-700 sm:hidden"
              >
                {theme.theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {view === "quiz" && quiz.status === "ready" && (
                <CategoryFilter
                  categories={quiz.categories}
                  value={quiz.category}
                  onChange={quiz.setCategory}
                />
              )}
              <button
                type="button"
                onClick={theme.toggle}
                aria-label={theme.theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
                className="hidden rounded-lg px-2 py-1 text-lg ring-1 ring-slate-300 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:ring-slate-600 dark:hover:bg-slate-700 sm:block"
              >
                {theme.theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="モード切替">
            <NavTab active={view === "home"} onClick={() => setView("home")}>ホーム</NavTab>
            <NavTab active={view === "quiz"} onClick={() => setView("quiz")}>4択クイズ</NavTab>
            <NavTab active={view === "card"} onClick={() => setView("card")}>暗記カード</NavTab>
            <NavTab active={view === "dictionary"} onClick={() => setView("dictionary")}>用語辞典</NavTab>
            <NavTab active={view === "learn"} onClick={() => setView("learn")}>学ぶ</NavTab>
            <NavTab active={view === "interview"} onClick={() => setView("interview")}>面接練習</NavTab>
            <NavTab active={view === "mock"} onClick={() => setView("mock")}>模擬面接</NavTab>
            <NavTab active={view === "guide"} onClick={() => setView("guide")}>解説集</NavTab>
            <NavTab active={view === "dashboard"} onClick={() => setView("dashboard")}>ダッシュボード</NavTab>
            <NavTab active={view === "review"} onClick={() => setView("review")}>振り返り</NavTab>
            <NavTab active={view === "prep"} onClick={() => setView("prep")}>自己PR</NavTab>
            <NavTab active={view === "author"} onClick={() => setView("author")}>マイ問題</NavTab>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {view === "home" && <HomeView onNavigate={(v) => setView(v)} />}

        {view === "quiz" && (
          <>
            {quiz.status === "loading" && <p className="text-center text-slate-500 dark:text-slate-400">読み込み中…</p>}
            {quiz.status === "error" && (
              <p className="rounded-xl bg-rose-50 p-4 text-center text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900">
                用語データを読み込めませんでした。
              </p>
            )}
            {quiz.status === "ready" && (
              <>
                <div className="mb-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">解答数 <span className="font-bold text-slate-900 dark:text-slate-100">{quiz.answeredCount}</span></span>
                  <span className="text-slate-600 dark:text-slate-300">正答 <span className="font-bold text-emerald-700 dark:text-emerald-400">{quiz.correctCount}</span></span>
                  <span className="text-slate-600 dark:text-slate-300">正答率 <span className="font-bold text-sky-700 dark:text-sky-400">{rate}%</span></span>
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
                  <p className="text-center text-slate-500 dark:text-slate-400">この分野には出題できる用語がありません。</p>
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
      </main>
    </div>
  );
}

function NavTab({
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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        active
          ? "bg-sky-700 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
