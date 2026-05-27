import type { Term, Progress, UserContent } from "../types";
import type { TermRepository } from "./termRepository";
import termsData from "../data/terms.json";

// MVP 実装: 用語は同梱 JSON、進捗・ユーザー作問は localStorage（要件定義書 §2 C-1/C-2・§8-4）。
const PROGRESS_KEY = "term-board:progress:v1";
const USER_CONTENT_KEY = "term-board:userContent:v1";
const BOOKMARKS_KEY = "term-board:bookmarks:v1";

const EMPTY_USER_CONTENT: UserContent = { quizTerms: [], interviewQuestions: [] };

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

// ユーザー作問の読み込み。壊れていても空で返し、出題（builtin）は継続する。
function readUserContent(): UserContent {
  try {
    const raw = localStorage.getItem(USER_CONTENT_KEY);
    if (!raw) return EMPTY_USER_CONTENT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return EMPTY_USER_CONTENT;
    }
    const obj = parsed as Partial<UserContent>;
    return {
      quizTerms: Array.isArray(obj.quizTerms) ? obj.quizTerms : [],
      interviewQuestions: Array.isArray(obj.interviewQuestions) ? obj.interviewQuestions : [],
    };
  } catch {
    return EMPTY_USER_CONTENT;
  }
}

export const localStorageTermRepository: TermRepository = {
  async getTerms(): Promise<Term[]> {
    // 同梱（builtin）＋ ユーザー作問（user）を統合して出題対象にする。
    const builtin = (termsData as Term[]).map((t) => ({ ...t, source: "builtin" as const }));
    const user = readUserContent().quizTerms.map((t) => ({ ...t, source: "user" as const }));
    return [...builtin, ...user];
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

  async getUserContent(): Promise<UserContent> {
    return readUserContent();
  },

  async saveUserContent(c: UserContent): Promise<void> {
    try {
      localStorage.setItem(USER_CONTENT_KEY, JSON.stringify(c));
    } catch {
      console.warn("[term-board] 作問データの保存に失敗しました。");
    }
  },

  async getBookmarks(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  },

  async saveBookmarks(ids: string[]): Promise<void> {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
    } catch {
      console.warn("[term-board] ブックマークの保存に失敗しました。");
    }
  },
};
