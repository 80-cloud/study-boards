import { useQuiz } from "./hooks/useQuiz";
import { CategoryFilter } from "./components/CategoryFilter";
import { QuizView } from "./components/QuizView";

export default function App() {
  const quiz = useQuiz();
  const rate =
    quiz.answeredCount > 0
      ? Math.round((quiz.correctCount / quiz.answeredCount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">IT用語ボード</h1>
            <p className="text-xs text-slate-500">面接で言えるまで、4択で定着させる</p>
          </div>
          {quiz.status === "ready" && (
            <CategoryFilter
              categories={quiz.categories}
              value={quiz.category}
              onChange={quiz.setCategory}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {quiz.status === "loading" && (
          <p className="text-center text-slate-500">読み込み中…</p>
        )}

        {quiz.status === "error" && (
          <p className="rounded-xl bg-rose-50 p-4 text-center text-rose-700 ring-1 ring-rose-200">
            用語データを読み込めませんでした。
          </p>
        )}

        {quiz.status === "ready" && (
          <>
            <div className="mb-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200">
              <span className="text-slate-600">
                解答数 <span className="font-bold text-slate-900">{quiz.answeredCount}</span>
              </span>
              <span className="text-slate-600">
                正答 <span className="font-bold text-emerald-700">{quiz.correctCount}</span>
              </span>
              <span className="text-slate-600">
                正答率 <span className="font-bold text-sky-700">{rate}%</span>
              </span>
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
              <p className="text-center text-slate-500">この分野には出題できる用語がありません。</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
