import { describe, expect, it } from "vitest";
import { srsWeight } from "./srs";

describe("srsWeight", () => {
  it("未出題（statなし）を最優先（=6）", () => {
    expect(srsWeight()).toBe(6);
    expect(srsWeight(undefined)).toBe(6);
  });

  it("正答=誤答（net0）なら 5", () => {
    expect(srsWeight({ correct: 0, wrong: 0 })).toBe(5);
    expect(srsWeight({ correct: 3, wrong: 3 })).toBe(5);
  });

  it("誤答超過（net<0）で重みが増える", () => {
    expect(srsWeight({ correct: 0, wrong: 1 })).toBe(6); // 5-(-1)
    expect(srsWeight({ correct: 0, wrong: 3 })).toBe(8); // 5-(-3)
  });

  it("正答超過（net>0）で重みが減る", () => {
    expect(srsWeight({ correct: 1, wrong: 0 })).toBe(4);
    expect(srsWeight({ correct: 3, wrong: 0 })).toBe(2);
  });

  it("正答を積んでも下限は1（必ず再登場の余地）", () => {
    expect(srsWeight({ correct: 10, wrong: 0 })).toBe(1);
    expect(srsWeight({ correct: 100, wrong: 0 })).toBe(1);
  });

  it("未出題(6) は誤答1回(6)と同等以上で、定着済みより常に高い", () => {
    expect(srsWeight()).toBeGreaterThan(srsWeight({ correct: 1, wrong: 0 }));
  });
});
