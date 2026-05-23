package com.reviewboard.domain.review;

/**
 * F-GROW-01 成長ループ：投稿者が各レビューへの対応をどう進めたかの状態（投稿者本人のみ設定）。
 */
public enum GrowthStatus {
    /** 未対応（既定） */
    OPEN,
    /** 修正済み */
    FIXED,
    /** 対応不要 */
    WONT_FIX,
    /** 再レビュー依頼（レビュアーにもう一度見てほしい） */
    RE_REVIEW_REQUESTED,
    /** 解決済み */
    RESOLVED
}
