import type { Question } from "../hooks/useQuiz";

type Props = {
  question: Question;
  selected: string | null;
  isCorrect: boolean | null;
  onAnswer: (choice: string) => void;
  onNext: () => void;
};

// 選択肢ボタンの見た目を、回答状態に応じて決める。
// 母 P-9 / 受入条件: 正誤は「色のみに依存しない」ため記号（◯/✕）とテキストでも示す。
function optionClass(args: {
  answered: boolean;
  isThisCorrect: boolean;
  isThisSelected: boolean;
}): string {
  const base =
    "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base transition focus:outline-none focus:ring-2 focus:ring-sky-400";
  if (!args.answered) {
    return `${base} border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:bg-slate-700`;
  }
  if (args.isThisCorrect) {
    return `${base} border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200`;
  }
  if (args.isThisSelected) {
    return `${base} border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200`;
  }
  return `${base} border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500`;
}

export function QuizView({ question, selected, isCorrect, onAnswer, onNext }: Props) {
  const answered = selected !== null;

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <p className="text-sm font-medium text-sky-700 dark:text-sky-400">{question.term.category}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          「{question.term.term}」の意味は？
        </h2>
      </div>

      <ul className="flex flex-col gap-3">
        {question.options.map((opt) => {
          const isThisCorrect = opt === question.answer;
          const isThisSelected = opt === selected;
          return (
            <li key={opt}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onAnswer(opt)}
                className={optionClass({ answered, isThisCorrect, isThisSelected })}
              >
                {answered && (
                  <span aria-hidden="true" className="shrink-0 text-lg font-bold">
                    {isThisCorrect ? "◯" : isThisSelected ? "✕" : "　"}
                  </span>
                )}
                <span>{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <p
            className={`text-lg font-bold ${
              isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
            }`}
          >
            {isCorrect ? "◯ 正解！" : "✕ 不正解"}
          </p>
          {question.term.plainMeaning && (
            <div className="mt-3 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-100 dark:bg-sky-950 dark:ring-sky-900">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-sky-800 dark:text-sky-300">かんたんに言うと：</span>
                {question.term.plainMeaning}
              </p>
            </div>
          )}
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">正しい意味：</span>
            {question.answer}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">面接での言い方：</span>
            {question.term.interview}
          </p>
          {question.term.scene && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">現場では：</span>
              {question.term.scene}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="mt-4 rounded-xl bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            次の問題 →
          </button>
        </div>
      )}
    </section>
  );
}
