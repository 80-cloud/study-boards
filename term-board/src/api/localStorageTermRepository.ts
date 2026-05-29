import type { Term, Progress, UserContent, ProfileDraft, LearningSession } from "../types";
import type { TermRepository } from "./termRepository";
import termsData from "../data/terms.json";

// MVP 実装: 用語は同梱 JSON、進捗・ユーザー作問は localStorage（要件定義書 §2 C-1/C-2・§8-4）。
const PROGRESS_KEY = "term-board:progress:v1";
const CARD_PROGRESS_KEY = "term-board:cardProgress:v1";
const USER_CONTENT_KEY = "term-board:userContent:v1";
const BOOKMARKS_KEY = "term-board:bookmarks:v1";
const STUDY_DAYS_KEY = "term-board:studyDays:v1";
const PROFILE_KEY = "term-board:profile:v1";
const LEARNING_LOG_KEY = "term-board:learningLog:v1";
const NOTES_KEY = "term-board:notes:v1";
const REVERSE_Q_KEY = "term-board:reverseQuestions:v1";
const MISSES_KEY = "term-board:misses:v1";

// 1用語あたり保持する「選んだ誤答」の最大件数（直近のみ）。
const MISSES_PER_TERM_MAX = 3;

// ログの肥大化を防ぐため、直近 N 件のみ保持する（集計は件数で十分）。
const LEARNING_LOG_MAX = 1000;

// F-LOG-05: エクスポート/インポート対象のキー（テーマは UI 設定なので除外）。
const EXPORT_KEYS = [
  PROGRESS_KEY,
  CARD_PROGRESS_KEY,
  USER_CONTENT_KEY,
  BOOKMARKS_KEY,
  STUDY_DAYS_KEY,
  PROFILE_KEY,
  LEARNING_LOG_KEY,
  NOTES_KEY,
  REVERSE_Q_KEY,
  MISSES_KEY,
] as const;

const EMPTY_USER_CONTENT: UserContent = { quizTerms: [], interviewQuestions: [] };

// 要件定義書 §4-1 / A-4: localStorage の破損・容量超過・未対応でも
// 「進捗のみ初期化して用語出題は継続する」graceful degradation を守る。
function readProgressFrom(key: string): Progress {
  try {
    const raw = localStorage.getItem(key);
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
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const obj =
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Partial<UserContent>)
        : {};
    const quizTerms = Array.isArray(obj.quizTerms) ? obj.quizTerms : [];
    const interviewQuestions = Array.isArray(obj.interviewQuestions) ? obj.interviewQuestions : [];
    // #425: 逆質問が UserContent 側に未設定なら、旧キーから取り込んで一段化する
    // （次回 saveUserContent で UserContent 側に永続化される）。
    const fromUserContent = Array.isArray(obj.reverseQuestions) ? obj.reverseQuestions : null;
    const reverseQuestions = fromUserContent ?? readLegacyReverseQuestions();
    const flashcards = Array.isArray(obj.flashcards) ? obj.flashcards : [];
    return { quizTerms, interviewQuestions, reverseQuestions, flashcards };
  } catch {
    return EMPTY_USER_CONTENT;
  }
}

// 旧 reverseQuestions:v1（#425 統合前の独立キー）の読み込み。
// 破損時は空配列。
function readLegacyReverseQuestions(): string[] {
  try {
    const raw = localStorage.getItem(REVERSE_Q_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const localStorageTermRepository: TermRepository = {
  async getTerms(): Promise<Term[]> {
    // 同梱（builtin）＋ ユーザー作問（user / shared）を統合して出題対象にする。
    // 既存の source を尊重し、未指定なら user とみなす（shared は importCode で付与済み）。
    // Flashcard は distractors を持たないので 4択/辞典では使わない（getCardItems で合流）。
    const builtin = (termsData as Term[]).map((t) => ({ ...t, source: "builtin" as const }));
    const user = readUserContent().quizTerms.map((t) => ({ ...t, source: t.source ?? "user" }));
    return [...builtin, ...user];
  },

  // #427: 暗記カードビュー用。4択用語＋Flashcard を Term 形に正規化して返す。
  // Flashcard は distractors=[]・interview="" で埋め、CardView 側は空のとき非表示にする。
  async getCardItems(): Promise<Term[]> {
    const base = await this.getTerms();
    const flashcards = readUserContent().flashcards ?? [];
    const asTerms: Term[] = flashcards.map((f) => ({
      id: f.id,
      category: f.category && f.category.trim() !== "" ? f.category : "暗記カード",
      term: f.front,
      meaning: f.back,
      distractors: [],
      interview: "",
      source: f.source ?? "user",
      level: f.level, // #444: 暗記カードもレベルフィルタに参加
    }));
    return [...base, ...asTerms];
  },

  async getProgress(): Promise<Progress> {
    return readProgressFrom(PROGRESS_KEY);
  },

  async saveProgress(p: Progress): Promise<void> {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    } catch {
      // 容量超過・プライベートモード等で保存できなくても学習は継続させる（silent にはしない）。
      console.warn("[term-board] 進捗の保存に失敗しました。学習は継続します。");
    }
  },

  async getCardProgress(): Promise<Progress> {
    return readProgressFrom(CARD_PROGRESS_KEY);
  },

  async saveCardProgress(p: Progress): Promise<void> {
    try {
      localStorage.setItem(CARD_PROGRESS_KEY, JSON.stringify(p));
    } catch {
      console.warn("[term-board] 暗記カードの習熟度の保存に失敗しました。学習は継続します。");
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

  async getStudyDays(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(STUDY_DAYS_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  },

  async recordStudyDay(day: string): Promise<void> {
    try {
      const days = await this.getStudyDays();
      if (days.includes(day)) return;
      localStorage.setItem(STUDY_DAYS_KEY, JSON.stringify([...days, day]));
    } catch {
      // 記録失敗でも学習は継続
    }
  },

  async getProfileDraft(): Promise<ProfileDraft | null> {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      return parsed as ProfileDraft;
    } catch {
      return null;
    }
  },

  async saveProfileDraft(p: ProfileDraft): Promise<void> {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      console.warn("[term-board] 自己PRの保存に失敗しました。");
    }
  },

  async getLearningLog(): Promise<LearningSession[]> {
    try {
      const raw = localStorage.getItem(LEARNING_LOG_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // 壊れた要素は除外（必須フィールドの型を最低限ガード）。
      return (parsed as unknown[]).filter(
        (s): s is LearningSession =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as LearningSession).id === "string" &&
          typeof (s as LearningSession).asked === "number" &&
          typeof (s as LearningSession).correct === "number",
      );
    } catch {
      return [];
    }
  },

  async appendLearningSession(session: LearningSession): Promise<void> {
    try {
      const log = await this.getLearningLog();
      const next = [...log, session].slice(-LEARNING_LOG_MAX);
      localStorage.setItem(LEARNING_LOG_KEY, JSON.stringify(next));
    } catch {
      console.warn("[term-board] 学習ログの保存に失敗しました。学習は継続します。");
    }
  },

  async getNotes(): Promise<Record<string, string>> {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      // 値が文字列のものだけ採用（破損ガード）。
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    } catch {
      return {};
    }
  },

  async saveNote(day: string, text: string): Promise<void> {
    try {
      const notes = await this.getNotes();
      if (text.trim() === "") {
        delete notes[day]; // 空メモは保持しない
      } else {
        notes[day] = text;
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      console.warn("[term-board] 学習メモの保存に失敗しました。");
    }
  },

  async getMisses(): Promise<Record<string, string[]>> {
    try {
      const raw = localStorage.getItem(MISSES_KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      const out: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
      }
      return out;
    } catch {
      return {};
    }
  },

  async recordMiss(termId: string, chosen: string): Promise<void> {
    try {
      const misses = await this.getMisses();
      const prev = misses[termId] ?? [];
      // 直近の誤答を先頭に、重複を除き上限まで保持する。
      const next = [chosen, ...prev.filter((c) => c !== chosen)].slice(0, MISSES_PER_TERM_MAX);
      misses[termId] = next;
      localStorage.setItem(MISSES_KEY, JSON.stringify(misses));
    } catch {
      // 記録失敗でも学習は継続
    }
  },

  async exportAll(): Promise<string> {
    // 入出力対象の全データキー（テーマは UI 設定なので含めない）。
    const data: Record<string, unknown> = {};
    for (const key of EXPORT_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        data[key] = JSON.parse(raw);
      } catch {
        // 壊れたキーはスキップ（エクスポートは止めない）。
      }
    }
    return JSON.stringify({ app: "term-board", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  },

  async importAll(json: string): Promise<boolean> {
    try {
      const parsed: unknown = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) return false;
      const obj = parsed as { data?: unknown };
      if (typeof obj.data !== "object" || obj.data === null) return false;
      const data = obj.data as Record<string, unknown>;
      // 既知キーのみ復元（未知キーは無視＝安全側）。
      for (const key of EXPORT_KEYS) {
        if (!(key in data)) continue;
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
      return true;
    } catch {
      return false;
    }
  },

  async resetProgress(): Promise<void> {
    try {
      // 学習記録のみ初期化。作問・ブックマーク・自己PR下書きは保持する。
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(STUDY_DAYS_KEY);
      localStorage.removeItem(LEARNING_LOG_KEY);
    } catch {
      console.warn("[term-board] 進捗のリセットに失敗しました。");
    }
  },
};
