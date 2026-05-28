import { useEffect, useState } from "react";
import type { UserContent } from "../types";
import { decodeShareCode } from "../utils/share";

// #431: URL クエリ ?import=<base64> で渡された共有コードを「プレビュー状態」で保持する。
// 自動取り込みはせず、画面側がユーザーの明示操作（取り込む/キャンセル）を受けてから反映する。

export type PendingImport = {
  code: string;
  preview: {
    quiz: number;
    interview: number;
    reverse: number;
    flashcard: number;
  };
};

// クエリパラメータ名（変更時は SharePanel と整合させること）。
const QUERY_KEY = "import";

// URL から `import` パラメータを除去（取り込み・キャンセル時にリロード再発火を防ぐため）。
function stripImportFromURL() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(QUERY_KEY)) return;
  url.searchParams.delete(QUERY_KEY);
  // クエリが空になったら "?" も落とす（クリーンな URL に）。
  const search = url.searchParams.toString();
  const newUrl = url.pathname + (search ? `?${search}` : "") + url.hash;
  window.history.replaceState(null, "", newUrl);
}

export function usePendingImport(): {
  pending: PendingImport | null;
  clear: () => void;
} {
  const [pending, setPending] = useState<PendingImport | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URL(window.location.href).searchParams.get(QUERY_KEY);
    if (!code) return;
    try {
      const decoded: UserContent = decodeShareCode(code);
      setPending({
        code,
        preview: {
          quiz: decoded.quizTerms.length,
          interview: decoded.interviewQuestions.length,
          reverse: decoded.reverseQuestions?.length ?? 0,
          flashcard: decoded.flashcards?.length ?? 0,
        },
      });
    } catch {
      // 不正な base64・空コードは黙って無視（URL からは外して二重発火を防ぐ）。
      stripImportFromURL();
    }
  }, []);

  const clear = () => {
    setPending(null);
    stripImportFromURL();
  };

  return { pending, clear };
}
