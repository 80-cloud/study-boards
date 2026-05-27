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
  removeQuizTerm: (id: string) => void;
  removeInterviewQuestion: (id: string) => void;
  exportCode: () => string;
  /** 共有コードを取り込み、追加件数を返す。失敗時は例外を投げる。 */
  importCode: (code: string) => { quiz: number; interview: number };
};

const EMPTY: UserContent = { quizTerms: [], interviewQuestions: [] };

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

  const exportCode = useCallback(() => encodeShareCode(content), [content]);

  // 取り込み時はIDを振り直して衝突を避け、既存に追記する。
  const importCode = useCallback(
    (code: string) => {
      const incoming = decodeShareCode(code);
      const quiz = incoming.quizTerms.map((t) => ({ ...t, id: newId(), source: "user" as const }));
      const interview = incoming.interviewQuestions.map((q) => ({
        ...q,
        id: newId(),
        source: "user" as const,
      }));
      setContent((prev) => {
        const next: UserContent = {
          quizTerms: [...prev.quizTerms, ...quiz],
          interviewQuestions: [...prev.interviewQuestions, ...interview],
        };
        void repository.saveUserContent(next);
        return next;
      });
      return { quiz: quiz.length, interview: interview.length };
    },
    [],
  );

  return {
    content,
    addQuizTerm,
    addInterviewQuestion,
    removeQuizTerm,
    removeInterviewQuestion,
    exportCode,
    importCode,
  };
}
