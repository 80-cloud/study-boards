import type { LevelFilter, Level } from "../hooks/useLevel";
import { LEVELS } from "../hooks/useLevel";

// #437: 学習レベル選択チップ（全レベル / 初級 / 中級 / 上級）。
// 覚える系3ビュー（4択クイズ・暗記カード・用語辞典）共通で使う。

type Props = {
  value: LevelFilter;
  onChange: (next: LevelFilter) => void;
  /** 各レベルの該当件数を表示する場合に渡す（任意・undefined なら件数非表示） */
  counts?: { all: number } & Partial<Record<Level, number>>;
  className?: string;
};

export function LevelSelector({ value, onChange, counts, className = "" }: Props) {
  const items: { key: LevelFilter; label: string; count?: number }[] = [
    { key: "all", label: "全レベル", count: counts?.all },
    ...LEVELS.map((lv) => ({ key: lv as LevelFilter, label: lv, count: counts?.[lv] })),
  ];
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label="学習レベル">
      <span className="text-sm font-medium text-label-2">レベル</span>
      {items.map(({ key, label, count }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? "bg-accent-fill text-white"
                : "bg-fill-quaternary text-label-2 hover:text-label"
            }`}
          >
            {label}
            {typeof count === "number" && (
              <span className={`ml-1 ${active ? "opacity-90" : "opacity-70"}`}>({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
