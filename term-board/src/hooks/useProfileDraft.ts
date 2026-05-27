import { useEffect, useState } from "react";
import type { ProfileDraft } from "../types";
import { repository } from "../api";

// B5: 自己紹介・志望動機の下書きを管理（localStorage 保存・自動保存）。
const EMPTY: ProfileDraft = {
  selfIntro: { name: "", background: "", learning: "", work: "", closing: "" },
  motivation: { trigger: "", companyReason: "", action: "", future: "" },
};

export type UseProfileDraft = {
  draft: ProfileDraft;
  setSelfIntro: (k: keyof ProfileDraft["selfIntro"], v: string) => void;
  setMotivation: (k: keyof ProfileDraft["motivation"], v: string) => void;
};

export function useProfileDraft(): UseProfileDraft {
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY);

  useEffect(() => {
    let active = true;
    repository.getProfileDraft().then((p) => {
      if (active && p) setDraft({ selfIntro: { ...EMPTY.selfIntro, ...p.selfIntro }, motivation: { ...EMPTY.motivation, ...p.motivation } });
    });
    return () => {
      active = false;
    };
  }, []);

  const setSelfIntro = (k: keyof ProfileDraft["selfIntro"], v: string) => {
    setDraft((prev) => {
      const next = { ...prev, selfIntro: { ...prev.selfIntro, [k]: v } };
      void repository.saveProfileDraft(next);
      return next;
    });
  };

  const setMotivation = (k: keyof ProfileDraft["motivation"], v: string) => {
    setDraft((prev) => {
      const next = { ...prev, motivation: { ...prev.motivation, [k]: v } };
      void repository.saveProfileDraft(next);
      return next;
    });
  };

  return { draft, setSelfIntro, setMotivation };
}
