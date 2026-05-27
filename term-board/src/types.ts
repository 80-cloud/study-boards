// 要件定義書 §8 データモデル設計方針。
// 1用語 → 3モード（4択・暗記カード・面接問答）を導出する DRY な中心型。

export type Term = {
  id: string; // 例 "tcp-ip"
  category: string; // 分野。例 "ネットワーク"
  term: string; // 表示名。例 "TCP/IP"
  meaning: string; // 正しい意味（暗記カード裏／4択の正解）
  distractors: string[]; // 4択の誤答。meaning と混ぜてシャッフルする
  interview: string; // 面接での短い言い方（核の単語＋結論）。Phase2 で使用
};

// 用語ごとの「実力」。termId で Term と結合する（用語の追加・修正が進捗を壊さない）。
export type Progress = {
  [termId: string]: {
    correct: number;
    wrong: number;
    lastAnsweredAt: string; // ISO 文字列
  };
};
