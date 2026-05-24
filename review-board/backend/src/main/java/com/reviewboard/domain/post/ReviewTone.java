package com.reviewboard.domain.post;

/**
 * F-SAFE-01 心理的安全設定：投稿者が希望するレビューのトーン（単一選択）。
 * 未設定は null（列 nullable）で表す。R-02（萎縮）対策の起点。
 */
public enum ReviewTone {
    /** 初学者歓迎：基礎的な指摘も歓迎 */
    WELCOME_BEGINNER,
    /** 辛口OK：厳しめの指摘を歓迎 */
    HARSH_OK,
    /** 優しめ希望：言葉選びに配慮してほしい */
    GENTLE,
    /** じっくり詳しく：時間をかけて深く見てほしい */
    DETAILED,
    /** ざっくりでOK：要点だけ手早く見てほしい */
    QUICK_OK
}
