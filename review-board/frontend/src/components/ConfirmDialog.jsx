import { useEffect, useRef } from 'react';

// #496 P5：破壊操作の確認ダイアログ。ESC / 背景クリックでキャンセル可能・focus trap 付き。
// 既存の `window.confirm` を置き換えて、人に優しい確認 UI に統一する。
export default function ConfirmDialog({
  open,
  title = '確認',
  message,
  confirmLabel = '実行する',
  cancelLabel = 'キャンセル',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // open になったらキャンセル側にフォーカス（破壊操作なので安全側に倒す）。
  useEffect(() => {
    if (open && cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
  }, [open]);

  // ESC でキャンセル + 内部フォーカスを 2 ボタンの間で循環（focus trap）。
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === 'Tab') {
        const focusables = [cancelBtnRef.current, confirmBtnRef.current].filter(Boolean);
        if (focusables.length === 0) return;
        const active = document.activeElement;
        const idx = focusables.indexOf(active);
        e.preventDefault();
        const next = e.shiftKey
          ? focusables[(idx - 1 + focusables.length) % focusables.length]
          : focusables[(idx + 1) % focusables.length];
        next?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => {
        // 背景クリックでキャンセル（カード自体のクリックは止める）。
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-mac">
        <h2 id="confirm-title" className="mac-h text-lg text-navy-700">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="mac-btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={destructive
              ? 'rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700'
              : 'mac-btn-navy'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
