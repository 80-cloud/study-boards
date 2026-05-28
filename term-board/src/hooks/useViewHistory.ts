import { useCallback, useEffect, useState } from "react";

// SPAの戻る/進むでビューを同期する（URLハッシュベース・GitHub Pages 互換）。
// view が変わったら `history.pushState('#view')` し、ブラウザの戻るで前のビューへ戻れるようにする。
// 戻った先がアプリ外（リダイレクト前のURLや空ページ）になり真っ暗に見える挙動を防ぐ（#387）。

export function useViewHistory<V extends string>(views: readonly V[], initial: V): readonly [V, (v: V) => void] {
  const isView = (s: string): s is V => (views as readonly string[]).includes(s);
  const readHash = (): V => {
    if (typeof window === "undefined") return initial;
    const h = window.location.hash.replace(/^#/, "");
    return isView(h) ? h : initial;
  };

  const [view, setViewState] = useState<V>(readHash);

  useEffect(() => {
    // 初回：基準点を必ず履歴に置く（戻る先がアプリ外にならないようにする）。
    // hash が無ければ現在の view を replaceState で記録、あれば状態だけ同期。
    if (window.history.state == null || (window.history.state as { view?: string }).view == null) {
      const cur = readHash();
      window.history.replaceState({ view: cur }, "", `#${cur}`);
    }
    const onPop = () => setViewState(readHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setView = useCallback((next: V) => {
    setViewState(next);
    if (typeof window === "undefined") return;
    const cur = window.location.hash.replace(/^#/, "");
    if (cur !== next) {
      window.history.pushState({ view: next }, "", `#${next}`);
    }
  }, []);

  return [view, setView] as const;
}
