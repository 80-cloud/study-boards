import { beforeEach, describe, expect, it } from "vitest";
import { localStorageTermRepository as repo } from "./localStorageTermRepository";

const PROGRESS_KEY = "term-board:progress:v1";
const USER_CONTENT_KEY = "term-board:userContent:v1";
const STUDY_DAYS_KEY = "term-board:studyDays:v1";
const LEARNING_LOG_KEY = "term-board:learningLog:v1";
const BOOKMARKS_KEY = "term-board:bookmarks:v1";
const NOTES_KEY = "term-board:notes:v1";

beforeEach(() => {
  localStorage.clear();
});

describe("getProgress（破損ガード・受入A-4）", () => {
  it("未保存なら空オブジェクト", async () => {
    expect(await repo.getProgress()).toEqual({});
  });

  it("壊れたJSONは空にフォールバック", async () => {
    localStorage.setItem(PROGRESS_KEY, "{壊れた");
    expect(await repo.getProgress()).toEqual({});
  });

  it("配列・プリミティブ（スキーマ不一致）は空にフォールバック", async () => {
    localStorage.setItem(PROGRESS_KEY, "[]");
    expect(await repo.getProgress()).toEqual({});
    localStorage.setItem(PROGRESS_KEY, "5");
    expect(await repo.getProgress()).toEqual({});
    localStorage.setItem(PROGRESS_KEY, "null");
    expect(await repo.getProgress()).toEqual({});
  });

  it("正しいオブジェクトは保存→取得で往復する", async () => {
    const p = { "tcp-ip": { correct: 2, wrong: 1, lastAnsweredAt: "2026-05-28" } };
    await repo.saveProgress(p);
    expect(await repo.getProgress()).toEqual(p);
  });
});

describe("getTerms（builtin＋user統合）", () => {
  it("同梱用語に source=builtin が付与され、176語以上ある", async () => {
    const terms = await repo.getTerms();
    expect(terms.length).toBeGreaterThanOrEqual(176);
    expect(terms.every((t) => t.source === "builtin" || t.source === "user")).toBe(true);
    expect(terms.some((t) => t.id === "tcp-ip" && t.source === "builtin")).toBe(true);
  });

  it("ユーザー作問が source=user で統合される", async () => {
    localStorage.setItem(
      USER_CONTENT_KEY,
      JSON.stringify({
        quizTerms: [
          { id: "u1", category: "テスト", term: "自作用語", meaning: "m", distractors: ["a", "b", "c"], interview: "i" },
        ],
        interviewQuestions: [],
      }),
    );
    const terms = await repo.getTerms();
    const mine = terms.find((t) => t.id === "u1");
    expect(mine).toBeDefined();
    expect(mine?.source).toBe("user");
  });

  it("作問データが壊れていても builtin の出題は継続する", async () => {
    localStorage.setItem(USER_CONTENT_KEY, "{壊れた");
    const terms = await repo.getTerms();
    expect(terms.length).toBeGreaterThanOrEqual(176);
  });
});

describe("exportAll / importAll", () => {
  it("往復でデータが復元される", async () => {
    await repo.saveProgress({ "tcp-ip": { correct: 1, wrong: 0, lastAnsweredAt: "2026-05-28" } });
    await repo.saveBookmarks(["dns", "http"]);
    const exported = await repo.exportAll();

    localStorage.clear();
    expect(await repo.getProgress()).toEqual({});

    expect(await repo.importAll(exported)).toBe(true);
    expect(await repo.getProgress()).toEqual({ "tcp-ip": { correct: 1, wrong: 0, lastAnsweredAt: "2026-05-28" } });
    expect(await repo.getBookmarks()).toEqual(["dns", "http"]);
  });

  it("不正な入力は false を返し、既存データを壊さない", async () => {
    await repo.saveBookmarks(["dns"]);
    expect(await repo.importAll("not json")).toBe(false);
    expect(await repo.importAll("123")).toBe(false); // dataなし
    expect(await repo.importAll('{"foo":1}')).toBe(false); // data欠落
    expect(await repo.getBookmarks()).toEqual(["dns"]); // 無傷
  });

  it("既知キーのみ復元し、未知キーは無視する", async () => {
    const json = JSON.stringify({ data: { [BOOKMARKS_KEY]: ["x"], "term-board:unknown:v1": ["danger"] } });
    expect(await repo.importAll(json)).toBe(true);
    expect(await repo.getBookmarks()).toEqual(["x"]);
    expect(localStorage.getItem("term-board:unknown:v1")).toBeNull();
  });
});

describe("resetProgress", () => {
  it("学習記録のみ消し、作問・ブックマークは残す", async () => {
    await repo.saveProgress({ "tcp-ip": { correct: 1, wrong: 0, lastAnsweredAt: "2026-05-28" } });
    await repo.recordStudyDay("2026-05-28");
    await repo.appendLearningSession({ id: "s1", startedAt: "2026-05-28", mode: "quiz", asked: 5, correct: 4 });
    await repo.saveBookmarks(["dns"]);
    localStorage.setItem(USER_CONTENT_KEY, JSON.stringify({ quizTerms: [{ id: "u1" }], interviewQuestions: [] }));

    await repo.resetProgress();

    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(localStorage.getItem(STUDY_DAYS_KEY)).toBeNull();
    expect(localStorage.getItem(LEARNING_LOG_KEY)).toBeNull();
    expect(await repo.getBookmarks()).toEqual(["dns"]); // 残る
    expect(localStorage.getItem(USER_CONTENT_KEY)).not.toBeNull(); // 作問は残る
  });
});

describe("その他の破損ガード", () => {
  it("getBookmarks: 非配列は空配列", async () => {
    localStorage.setItem(BOOKMARKS_KEY, '{"a":1}');
    expect(await repo.getBookmarks()).toEqual([]);
  });

  it("getNotes: 値が文字列のものだけ採用", async () => {
    localStorage.setItem(NOTES_KEY, JSON.stringify({ "2026-05-28": "メモ", bad: 123 }));
    expect(await repo.getNotes()).toEqual({ "2026-05-28": "メモ" });
  });
});
