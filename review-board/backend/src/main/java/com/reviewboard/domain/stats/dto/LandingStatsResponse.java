package com.reviewboard.domain.stats.dto;

import com.reviewboard.domain.user.UserRole;

import java.util.List;

/**
 * トップページ（案L ランディング）の集計。すべて閲覧者の cohort 内に閉じた実データ（★S軸）。
 *
 * @param postsCount         cohort 内の未削除投稿数
 * @param reviewsCount       それらに付いた未削除レビュー数
 * @param approvedBadgesCount 最新評価が「合格」の投稿数（＝合格バッジ数）
 * @param featured           実績の見えるメンバー（受領レビュー数の多い順・最大3名）
 */
public record LandingStatsResponse(
        long postsCount,
        long reviewsCount,
        long approvedBadgesCount,
        List<FeaturedUser> featured) {

    /**
     * ヒーロー右側の実績カード用。
     *
     * @param postsCount   その人の cohort 内投稿数
     * @param reviewsCount 受領レビュー数（非正規化カウンタ）
     * @param approved     合格バッジ（投稿のいずれかが「合格」）
     */
    public record FeaturedUser(
            Long userId,
            String displayName,
            UserRole role,
            int postsCount,
            int reviewsCount,
            boolean approved) {
    }
}
