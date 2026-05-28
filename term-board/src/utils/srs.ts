// F-QUIZ-05: SRS（間隔反復）の出題優先度。Leitner 方式の簡易版。
// 4択クイズ・暗記カードで共有する。重みが大きいほど選ばれやすい（pickWeighted）。
// 未出題を最優先、誤答（まだ）が多いほど高く、正答（覚えた）を積むほど低く（間隔が伸びる）。
type Stat = { correct: number; wrong: number };

export function srsWeight(p?: Stat): number {
  if (!p) return 6; // 未出題を最優先
  const net = p.correct - p.wrong; // 定着度（正答超過＝定着）
  return Math.max(1, 5 - net); // net 0→5、誤答超過で増、正答で減（下限1で必ず再登場の余地）
}
