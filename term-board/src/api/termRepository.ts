import type { Term, Progress, UserContent } from "../types";

// 要件定義書 §8-4「api/ 層の隔離（育つ設計の核）」。
// 画面・フックは「データがどこから来るか」を知らず、このインタフェースだけに依存する。
// MVP は localStorage 実装、Phase4 は http 実装に差し替えるだけで画面は無改修（母 M-11）。
export interface TermRepository {
  // 出題用の用語（同梱 builtin ＋ ユーザー作問 quizTerms を統合して返す）。
  getTerms(): Promise<Term[]>;
  getProgress(): Promise<Progress>;
  saveProgress(p: Progress): Promise<void>;

  // F-USER: ユーザー作問データ（4択用語・面接Q&A）。
  getUserContent(): Promise<UserContent>;
  saveUserContent(c: UserContent): Promise<void>;

  // B1: ブックマーク（用語IDの配列）。
  getBookmarks(): Promise<string[]>;
  saveBookmarks(ids: string[]): Promise<void>;
}
