import type { Term, Progress } from "../types";

// 要件定義書 §8-4「api/ 層の隔離（育つ設計の核）」。
// 画面・フックは「データがどこから来るか」を知らず、このインタフェースだけに依存する。
// MVP は localStorage 実装、Phase4 は http 実装に差し替えるだけで画面は無改修（母 M-11）。
export interface TermRepository {
  getTerms(): Promise<Term[]>;
  getProgress(): Promise<Progress>;
  saveProgress(p: Progress): Promise<void>;
}
