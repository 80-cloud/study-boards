import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useViewHistory } from "./useViewHistory";

const VIEWS = ["home", "quiz", "dictionary"] as const;

beforeEach(() => {
  // 各テストで履歴とハッシュを初期化（jsdom はファイル単位で共有のため）。
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useViewHistory", () => {
  it("hashが無いときは初期値を採用し、replaceStateで #初期 を記録する", () => {
    const { result } = renderHook(() => useViewHistory(VIEWS, "home"));
    expect(result.current[0]).toBe("home");
    expect(window.location.hash).toBe("#home");
    expect((window.history.state as { view?: string }).view).toBe("home");
  });

  it("hashが有効なら初期値より優先される", () => {
    window.history.replaceState(null, "", "/#quiz");
    const { result } = renderHook(() => useViewHistory(VIEWS, "home"));
    expect(result.current[0]).toBe("quiz");
  });

  it("hashが未知の値なら初期値にフォールバック", () => {
    window.history.replaceState(null, "", "/#bogus");
    const { result } = renderHook(() => useViewHistory(VIEWS, "home"));
    expect(result.current[0]).toBe("home");
  });

  it("setView は pushState で履歴を積む", () => {
    const { result } = renderHook(() => useViewHistory(VIEWS, "home"));
    act(() => result.current[1]("quiz"));
    expect(result.current[0]).toBe("quiz");
    expect(window.location.hash).toBe("#quiz");
    expect((window.history.state as { view?: string }).view).toBe("quiz");
  });

  it("popstate でビューが復元される（戻るボタン相当）", () => {
    const { result } = renderHook(() => useViewHistory(VIEWS, "home"));
    act(() => result.current[1]("quiz"));
    act(() => result.current[1]("dictionary"));
    // 戻るで quiz へ。jsdom は実 popstate を発火しないため hash 変更 + イベント発火で代用。
    act(() => {
      window.history.replaceState({ view: "quiz" }, "", "#quiz");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("quiz");
  });
});
