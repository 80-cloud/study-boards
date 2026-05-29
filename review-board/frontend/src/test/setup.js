import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 25 は実験的に localStorage を持っており、jsdom と競合して
// `--localstorage-file` 警告 + setItem などが破壊される。
// jsdom の localStorage も Node 25 環境で不安定なため、テストでは
// 単純な in-memory 実装で差し替えてしまう（決定論性も上がる）。
function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null;
    },
    getItem(k) {
      return map.has(String(k)) ? map.get(String(k)) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

beforeEach(() => {
  // 各テストで完全に独立した store にする。
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  cleanup();
});
