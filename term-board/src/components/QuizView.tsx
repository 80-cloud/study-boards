import { useState } from "react";
import type { Question } from "../hooks/useQuiz";

type Props = {
  question: Question;
  selected: string | null;
  isCorrect: boolean | null;
  onAnswer: (choice: string) => void;
  onNext: () => void;
};

// 選択肢ボタンの見た目を、回答状態に応じて決める。
// P-9 / 受入条件: 正誤は「色のみに依存しない」ため記号（◯/✕）とテキストでも示す。
function optionClass(args: {
  answered: boolean;
  isThisCorrect: boolean;
  isThisSelected: boolean;
}): string {
  const base =
    "flex w-full items-center gap-3 rounded-control border px-4 py-3 text-left text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  if (!args.answered) {
    return `${base} border-separator bg-surface text-label hover:border-accent cursor-pointer active:scale-[0.99]`;
  }
  if (args.isThisCorrect) {
    return `${base} border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200`;
  }
  if (args.isThisSelected) {
    return `${base} border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200`;
  }
  return `${base} border-separator bg-surface text-label-3`;
}

// F-INTV-03: 深掘り「なぜ?」チェーン。追い質問を段階的に開示する（§4-5）。
// 質問を1問ずつ表示し、「答えを見る」で答えを開くと次の質問が現れる。
function FollowUpChain({ items }: { items: { q: string; a: string }[] }) {
  // step = 開示済みの「答え」の数（= 表示中の質問のうち何問に答えを出したか）。
  const [step, setStep] = useState(0);
  const visible = Math.min(step + 1, items.length);

  return (
    <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100 dark:bg-amber-950 dark:ring-amber-900">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">深掘り：面接ではこう重ねられます</p>
      <ol className="mt-2 flex flex-col gap-3">
        {items.slice(0, visible).map((it, i) => (
          <li key={i}>
            <p className="text-sm font-semibold text-label">Q. {it.q}</p>
            {i < step && (
              <p className="mt-1 text-sm leading-relaxed text-label-2">A. {it.a}</p>
            )}
          </li>
        ))}
      </ol>
      {step < items.length && (
        <button
          type="button"
          onClick={() => setStep((n) => n + 1)}
          className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          答えを見る
        </button>
      )}
    </div>
  );
}

export function QuizView({ question, selected, isCorrect, onAnswer, onNext }: Props) {
  const answered = selected !== null;

  return (
    // PC（lg〜）は「左＝質問＋選択肢／右＝正解＋解説」の2カラムにして、
    // 回答後に下までスクロールせず横並びで読めるようにする。モバイルは従来どおり縦積み。
    <section
      className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
      aria-live="polite"
    >
      {/* 左：質問＋選択肢 */}
      <div className="flex flex-col gap-5">
        <div className="hig-card p-6">
          <p className="text-sm font-medium text-accent">{question.term.category}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-label">
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
      </div>

      {/* 右：正解＋解説。モバイルは回答後にこの下段が現れる。
          PC は回答前から枠を確保（レイアウトが飛ばない）＋スクロール追従。 */}
      <div className={`${answered ? "" : "hidden lg:block"} lg:sticky lg:top-4`}>
        {answered ? (
          <div className="hig-card p-6">
            <p
              className={`text-lg font-bold ${
                isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {isCorrect ? "◯ 正解！" : "✕ 不正解"}
            </p>
            {question.term.plainMeaning && (
              <div className="mt-3 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-100 dark:bg-sky-950 dark:ring-sky-900">
                <p className="text-sm leading-relaxed text-label">
                  <span className="font-semibold text-accent">かんたんに言うと：</span>
                  {question.term.plainMeaning}
                </p>
              </div>
            )}
            <p className="mt-2 text-sm leading-relaxed text-label-2">
              <span className="font-semibold text-label">正しい意味：</span>
              {question.answer}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-label-2">
              <span className="font-semibold text-label">面接での言い方：</span>
              {question.term.interview}
            </p>
            {question.term.scene && (
              <p className="mt-2 text-sm leading-relaxed text-label-2">
                <span className="font-semibold text-label">現場では：</span>
                {question.term.scene}
              </p>
            )}
            {question.term.followUps && question.term.followUps.length > 0 && (
              <FollowUpChain key={question.term.id} items={question.term.followUps} />
            )}
            <button
              type="button"
              onClick={onNext}
              autoFocus
              className="hig-btn-primary mt-4 px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              次の問題 →
            </button>
          </div>
        ) : (
          // PC のみ：回答前のプレースホルダ（右カラムの枠を確保し、回答時のガタつきを防ぐ）。
          <div className="hig-card flex min-h-[16rem] items-center justify-center p-6 text-center">
            <p className="text-sm leading-relaxed text-label-3">
              選択肢を選ぶと、ここに
              <br />
              正解と解説が表示されます。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
