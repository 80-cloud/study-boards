import type { UserContent, Term, InterviewQuestion, Flashcard } from "../types";

// F-USER-02: 作問データを「共有コード」に変換／復元する（サーバー無しのピア共有）。
// 共有コードは Discord 等に貼れる base64 文字列。Unicode を壊さず往復させる。

const SHARE_VERSION = 1;

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// 一意ID（共有時の衝突を避けるため取り込み側で振り直す）。
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function encodeShareCode(content: UserContent): string {
  return utf8ToBase64(JSON.stringify({ v: SHARE_VERSION, ...content }));
}

// 共有コードを UserContent に復元する。形式が不正なら例外を投げる（呼び出し側で握る）。
export function decodeShareCode(code: string): UserContent {
  const obj: unknown = JSON.parse(base64ToUtf8(code));
  if (typeof obj !== "object" || obj === null) throw new Error("共有コードの形式が不正です。");
  const o = obj as {
    quizTerms?: unknown;
    interviewQuestions?: unknown;
    reverseQuestions?: unknown;
    flashcards?: unknown;
  };
  const quizTerms = Array.isArray(o.quizTerms) ? (o.quizTerms as Term[]) : [];
  const interviewQuestions = Array.isArray(o.interviewQuestions)
    ? (o.interviewQuestions as InterviewQuestion[])
    : [];
  // 逆質問は文字列配列。型不一致は黙って捨てる（落とすほうが安全）。
  const reverseQuestions = Array.isArray(o.reverseQuestions)
    ? (o.reverseQuestions.filter((x): x is string => typeof x === "string"))
    : [];
  // Flashcard は front/back が両方文字列のものだけ受理（型不一致は捨てる）。
  const flashcards = Array.isArray(o.flashcards)
    ? (o.flashcards as Flashcard[]).filter(
        (f): f is Flashcard =>
          typeof f === "object" && f !== null && typeof f.front === "string" && typeof f.back === "string",
      )
    : [];
  if (
    quizTerms.length === 0 &&
    interviewQuestions.length === 0 &&
    reverseQuestions.length === 0 &&
    flashcards.length === 0
  ) {
    throw new Error("取り込める問題が含まれていません。");
  }
  return { quizTerms, interviewQuestions, reverseQuestions, flashcards };
}
