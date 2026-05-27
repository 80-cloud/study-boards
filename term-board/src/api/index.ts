import type { TermRepository } from "./termRepository";
import { localStorageTermRepository } from "./localStorageTermRepository";

// 差し替え点はここ1箇所のみ（要件定義書 §8-4）。
// Phase4 ではここを httpTermRepository に変えるだけで画面・フックは無改修。
export const repository: TermRepository = localStorageTermRepository;

export type { TermRepository } from "./termRepository";
