import { useEffect, useState } from 'react';

// #496 P5：削除直後に画面下部から滑り出る Undo バー。30 秒の猶予をユーザに与える。
// モーダルではないので触り続けられる（次の作業を止めない）。
const WINDOW_SECONDS = 30;

export default function UndoBar({ open, message, onUndo, onDismiss }) {
  const [remaining, setRemaining] = useState(WINDOW_SECONDS);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setRemaining(WINDOW_SECONDS);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = WINDOW_SECONDS - elapsed;
      if (left <= 0) {
        clearInterval(id);
        setRemaining(0);
        onDismiss?.();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [open, onDismiss]);

  if (!open) return null;

  const handleUndo = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onUndo?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-40 mx-auto flex max-w-md items-center justify-between gap-4 rounded-2xl bg-navy-700 px-5 py-3 text-sm text-white shadow-mac"
    >
      <span>
        {message}
        <span className="ml-2 text-xs text-gray-300">あと {remaining} 秒</span>
      </span>
      <button
        type="button"
        onClick={handleUndo}
        disabled={pending}
        className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-navy-700 transition hover:bg-white disabled:opacity-60"
      >
        {pending ? '復元中…' : '元に戻す'}
      </button>
    </div>
  );
}
