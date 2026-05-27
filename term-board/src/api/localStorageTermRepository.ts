import type { Term, Progress } from "../types";
import type { TermRepository } from "./termRepository";
import termsData from "../data/terms.json";

// MVP 実装: 用語は同梱 JSON、進捗は localStorage（要件定義書 §2 C-1/C-2・§8-4）。
const PROGRESS_KEY = "term-board:progress:v1";

// 要件定義書 §4-1 / A-4: localStorage の破損・容量超過・未対応でも
// 「進捗のみ初期化して用語出題は継続する」graceful degradation を守る。
function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    // スキーマ不一致（配列・null・プリミティブ）は壊れているとみなして破棄する。
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Progress;
  } catch {
    // パース失敗・localStorage 自体が使えない等。出題は止めない。
    return {};
  }
}

export const localStorageTermRepository: TermRepository = {
  async getTerms(): Promise<Term[]> {
    // import した JSON はビルド時に型が緩いため、中心型へ明示変換する。
    return termsData as Term[];
  },

  async getProgress(): Promise<Progress> {
    return readProgress();
  },

  async saveProgress(p: Progress): Promise<void> {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    } catch {
      // 容量超過・プライベートモード等で保存できなくても学習は継続させる（silent にはしない）。
      console.warn("[term-board] 進捗の保存に失敗しました。学習は継続します。");
    }
  },
};
