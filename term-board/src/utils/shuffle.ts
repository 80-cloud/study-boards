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
