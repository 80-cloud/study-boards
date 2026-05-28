import { afterEach, describe, expect, it, vi } from "vitest";
import { pickRandom, pickWeighted, shuffle } from "./shuffle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shuffle", () => {
  it("元配列を破壊せず、同じ要素集合を返す", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const result = shuffle(input);
    expect(input).toEqual(copy); // 非破壊
    expect(result).not.toBe(input); // 新しい配列
    expect([...result].sort((a, b) => a - b)).toEqual(copy); // 要素は保持
  });

  it("長さを保つ／空配列でも落ちない", () => {
    expect(shuffle([]).length).toBe(0);
    expect(shuffle(["a"]).length).toBe(1);
    expect(shuffle([1, 2, 3]).length).toBe(3);
  });
});

describe("pickRandom", () => {
  it("配列内の要素を返す", () => {
    const items = ["x", "y", "z"];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(pickRandom(items));
    }
  });

  it("Math.random=0 で先頭、末尾近傍で末尾を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandom([10, 20, 30])).toBe(10);
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(pickRandom([10, 20, 30])).toBe(30);
  });
});

describe("pickWeighted", () => {
  it("重みが大きい要素を優先して選ぶ", () => {
    const items = ["low", "high"];
    // 重み: low=1, high=99。total=100。r=50 → low(1)を引いて負にならず high が選ばれる。
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(pickWeighted(items, (t) => (t === "high" ? 99 : 1))).toBe("high");
  });

  it("r がごく小さいとき、わずかな重みの要素も選べる", () => {
    const items = ["low", "high"];
    vi.spyOn(Math, "random").mockReturnValue(0); // r=0 → 先頭(low)を即選択
    expect(pickWeighted(items, (t) => (t === "high" ? 99 : 1))).toBe("low");
  });

  it("全ての重みが0以下なら pickRandom にフォールバック（配列内を返す）", () => {
    const items = ["a", "b", "c"];
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const picked = pickWeighted(items, () => 0);
    expect(items).toContain(picked);
  });

  it("負の重みは0に丸められ、出題は止まらない", () => {
    const items = ["a", "b"];
    const picked = pickWeighted(items, () => -10);
    expect(items).toContain(picked);
  });
});
