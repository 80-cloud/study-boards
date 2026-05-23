package com.reviewboard.domain.post;

/**
 * 成果物の「AI使用状況」開示タグ（単一選択・未設定は null）。
 * エンジニアスクールの学習・評価の透明性のため、投稿者が任意で申告する。
 * レビュアーも前提（手書きか AI 補助か）が分かりレビューしやすくなる。
 */
public enum AiUsage {
    /** AI不使用：AI ツールを使わずに開発 */
    NONE,
    /** AI一部使用：一部に AI 補助を利用 */
    PARTIAL,
    /** AI使用：AI を活用して開発 */
    USED
}
