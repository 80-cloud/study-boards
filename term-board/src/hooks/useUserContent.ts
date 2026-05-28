import { useCallback, useEffect, useState } from "react";
import type { Term, InterviewQuestion, UserContent } from "../types";
import { repository } from "../api";
import { newId, encodeShareCode, decodeShareCode } from "../utils/share";

// F-USER-01/02: ユーザー作問データの管理（CRUD）と共有（エクスポート/インポート）。
// 保存は api/ 層（localStorage）経由。画面は保存先を知らない。

export type NewQuizTerm = Omit<Term, "id" | "source">;
export type NewInterviewQuestion = Omit<InterviewQuestion, "id" | "source">;

export type UseUserContent = {
  content: UserContent;
  addQuizTerm: (t: NewQuizTerm) => void;
  addInterviewQuestion: (q: NewInterviewQuestion) => void;
  /** 既存4択用語を更新（id・source は保持）。#389 */
  updateQuizTerm: (id: string, t: NewQuizTerm) => void;
  /** 既存面接Q&Aを更新（id・source は保持）。#389 */
  updateInterviewQuestion: (id: string, q: NewInterviewQuestion) => void;
  removeQuizTerm: (id: string) => void;
  removeInterviewQuestion: (id: string) => void;
  /** 逆質問を追加（重複は無視）。#425 */
  addReverseQuestion: (q: string) => void;
  /** 逆質問を削除。#425 */
  removeReverseQuestion: (q: string) => void;
  exportCode: () => string;
  /** 共有コードを取り込み、追加件数を返す。失敗時は例外を投げる。 */
  importCode: (code: string) => { quiz: number; interview: number; reverse: number };
};

const EMPTY: UserContent = { quizTerms: [], interviewQuestions: [], reverseQuestions: [] };

export function useUserContent(): UseUserContent {
  const [content, setContent] = useState<UserContent>(EMPTY);

  useEffect(() => {
    let active = true;
    repository.getUserContent().then((c) => {
      if (active) setContent(c);
    });
    return () => {
      active = false;
    };
  }, []);

  const addQuizTerm = useCallback(
    (t: NewQuizTerm) => {
      setContent((prev) => {
        const next: UserContent = {
          ...prev,
          quizTerms: [...prev.quizTerms, { ...t, id: newId(), source: "user" }],
        };
        void repository.saveUserContent(next);
        return next;
      });
    },
    [],
  );

  const addInterviewQuestion = useCallback((q: NewInterviewQuestion) => {
    setContent((prev) => {
      const next: UserContent = {
        ...prev,
        interviewQuestions: [
          ...prev.interviewQuestions,
          { ...q, id: newId(), source: "user" },
        ],
      };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  // 既存4択用語の更新（id・source を保持）。#389
  const updateQuizTerm = useCallback((id: string, t: NewQuizTerm) => {
    setContent((prev) => {
      const next: UserContent = {
        ...prev,
        quizTerms: prev.quizTerms.map((q) => (q.id === id ? { ...q, ...t } : q)),
      };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  // 既存面接Q&Aの更新（id・source を保持）。#389
  const updateInterviewQuestion = useCallback((id: string, q: NewInterviewQuestion) => {
    setContent((prev) => {
      const next: UserContent = {
        ...prev,
        interviewQuestions: prev.interviewQuestions.map((iq) =>
          iq.id === id ? { ...iq, ...q } : iq,
        ),
      };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const removeQuizTerm = useCallback((id: string) => {
    setContent((prev) => {
      const next = { ...prev, quizTerms: prev.quizTerms.filter((t) => t.id !== id) };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const removeInterviewQuestion = useCallback((id: string) => {
    setContent((prev) => {
      const next = {
        ...prev,
        interviewQuestions: prev.interviewQuestions.filter((q) => q.id !== id),
      };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const addReverseQuestion = useCallback((q: string) => {
    const v = q.trim();
    if (!v) return;
    setContent((prev) => {
      const current = prev.reverseQuestions ?? [];
      if (current.includes(v)) return prev; // 重複は追加しない
      const next: UserContent = { ...prev, reverseQuestions: [...current, v] };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const removeReverseQuestion = useCallback((q: string) => {
    setContent((prev) => {
      const current = prev.reverseQuestions ?? [];
      const next: UserContent = { ...prev, reverseQuestions: current.filter((x) => x !== q) };
      void repository.saveUserContent(next);
      return next;
    });
  }, []);

  const exportCode = useCallback(() => encodeShareCode(content), [content]);

  // 取り込み時はIDを振り直して衝突を避け、既存に追記する。
  // 取り込んだ問題は他者作なので source="shared" を付与（自作 user と区別。#385）。
  // 逆質問は文字列なのでIDなし、重複は無視（#425）。
  const importCode = useCallback(
    (code: string) => {
      const incoming = decodeShareCode(code);
      const quiz = incoming.quizTerms.map((t) => ({ ...t, id: newId(), source: "shared" as const }));
      const interview = incoming.interviewQuestions.map((q) => ({
        ...q,
        id: newId(),
        source: "shared" as const,
      }));
      const incomingReverse = incoming.reverseQuestions ?? [];
      let addedReverse = 0;
      setContent((prev) => {
        const prevReverse = prev.reverseQuestions ?? [];
        const mergedReverse = [...prevReverse];
        for (const q of incomingReverse) {
          if (!mergedReverse.includes(q)) {
            mergedReverse.push(q);
            addedReverse++;
          }
        }
        const next: UserContent = {
          quizTerms: [...prev.quizTerms, ...quiz],
          interviewQuestions: [...prev.interviewQuestions, ...interview],
          reverseQuestions: mergedReverse,
        };
        void repository.saveUserContent(next);
        return next;
      });
      return { quiz: quiz.length, interview: interview.length, reverse: addedReverse };
    },
    [],
  );

  return {
    content,
    addQuizTerm,
    addInterviewQuestion,
    updateQuizTerm,
    updateInterviewQuestion,
    removeQuizTerm,
    removeInterviewQuestion,
    addReverseQuestion,
    removeReverseQuestion,
    exportCode,
    importCode,
  };
}
