// Fisher–Yates シャッフル。元配列を破壊せず新しい配列を返す。
// F-QUIZ-03 / 受入条件 A-2「正解位置を毎回散らす」の基盤。
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 配列からランダムに1要素を選ぶ。
export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// F-QUIZ-05: 重み付きランダム選択。weight(t) が大きい要素ほど選ばれやすい。
// SRS（間隔反復）で「苦手・未出題を優先」する出題に使う。
// すべての重みが 0 以下になっても pickRandom にフォールバックし、出題は止めない（A-4）。
export function pickWeighted<T>(items: readonly T[], weight: (t: T) => number): T {
  const weights = items.map((t) => Math.max(0, weight(t)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pickRandom(items);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
