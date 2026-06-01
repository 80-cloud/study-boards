import { useState } from "react";

// F-INTV-03: 深掘り「なぜ?」チェーン。追い質問を段階的に開示する（§4-5）。
// 質問を1問ずつ表示し、「答えを見る」で答えを開くと次の質問が現れる。
// 4択クイズと面接練習で共通利用する（#547 で抽出）。
export function FollowUpChain({ items }: { items: { q: string; a: string }[] }) {
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
