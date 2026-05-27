import { useCallback, useEffect, useState } from "react";
import { repository } from "../api";

// B1: ブックマーク（用語ID集合）の管理。localStorage に保存（api/ 隔離経由）。
export type UseBookmarks = {
  ids: Set<string>;
  isBookmarked: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
};

export function useBookmarks(): UseBookmarks {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    repository.getBookmarks().then((arr) => {
      if (active) setIds(new Set(arr));
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void repository.saveBookmarks([...next]);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, isBookmarked, toggle, count: ids.size };
}
