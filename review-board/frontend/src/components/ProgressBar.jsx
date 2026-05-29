// #500 P8：アップロード進捗バー。
// - value: 0〜100 で確定進捗。未指定なら indeterminate（無限スライド）。
// - label: バー右上に併記するテキスト（「読み込み中… 2.3MB / 5MB」など）。
// - prefers-reduced-motion を尊重（アニメーション停止は CSS で対応）。
export default function ProgressBar({ value, label, className = '' }) {
  const isDeterminate = typeof value === 'number' && !Number.isNaN(value);
  const v = isDeterminate ? Math.max(0, Math.min(100, value)) : null;

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          {isDeterminate && <span className="tabular-nums">{v}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isDeterminate ? v : undefined}
        aria-label={!label ? 'アップロード中' : undefined}
        className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]"
      >
        {isDeterminate ? (
          <div
            className="h-full rounded-full bg-wrblue-500 transition-[width] duration-200 ease-out"
            style={{ width: `${v}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-wrblue-500 animate-[progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:w-full motion-reduce:opacity-50" />
        )}
      </div>
    </div>
  );
}
