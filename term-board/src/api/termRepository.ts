import type { Term, Progress, UserContent, ProfileDraft, LearningSession } from "../types";

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

  // B3: 学習した日（YYYY-MM-DD の配列）。ストリーク・学習日数の算出に使う。
  getStudyDays(): Promise<string[]>;
  recordStudyDay(day: string): Promise<void>;

  // B5: 自己紹介・志望動機の下書き。
  getProfileDraft(): Promise<ProfileDraft | null>;
  saveProfileDraft(p: ProfileDraft): Promise<void>;

  // F-INTV-02: 学習ログ（面接練習の自己採点など）。追記方式で蓄積する。
  getLearningLog(): Promise<LearningSession[]>;
  appendLearningSession(session: LearningSession): Promise<void>;

  // F-LOG-03: 学習メモ（日付 YYYY-MM-DD → 自由テキスト）。
  getNotes(): Promise<Record<string, string>>;
  saveNote(day: string, text: string): Promise<void>;

  // F-PROG-04 / F-LOG-05: データの入出力・初期化。
  // サーバー無しのためブラウザのデータをバックアップ・移行できるようにする。
  exportAll(): Promise<string>; // 全データを JSON 文字列で返す
  importAll(json: string): Promise<boolean>; // 復元（成功なら true）
  resetProgress(): Promise<void>; // 学習進捗（正誤・学習日・学習ログ）を初期化
}
