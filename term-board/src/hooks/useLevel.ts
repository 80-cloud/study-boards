import { useEffect, useState } from "react";

// #437: 学習レベルフィルタ（覚える系3ビュー共通）。
// 用語の Term.level（初級/中級/上級）に対応する選択値で、表示と出題を絞る。
// "all" は全レベルを意味し、覚える系の初回起動時のデフォルト。

const LEVEL_KEY = "term-board:level:v1";
export const LEVELS = ["初級", "中級", "上級"] as const;
export type Level = (typeof LEVELS)[number];
export type LevelFilter = "all" | Level;

function isLevelFilter(v: unknown): v is LevelFilter {
  return v === "all" || (typeof v === "string" && (LEVELS as readonly string[]).includes(v));
}

function initial(): LevelFilter {
  try {
    const saved = localStorage.getItem(LEVEL_KEY);
    if (isLevelFilter(saved)) return saved;
  } catch {
    // localStorage 不可でも続行
  }
  return "all";
}

export function useLevel() {
  const [level, setLevel] = useState<LevelFilter>(initial);

  useEffect(() => {
    try {
      localStorage.setItem(LEVEL_KEY, level);
    } catch {
      // 保存失敗でも継続（次回起動で "all" に戻るだけ）
    }
  }, [level]);

  return { level, setLevel };
}
