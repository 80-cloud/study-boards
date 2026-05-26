package com.reviewboard.domain.insights.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 週次トレンド（#275・運営限定）。直近 N 週を 7 日バケットで集計し、運営ダッシュボードで推移を可視化する。
 * weeks は古い週 → 新しい週の順。最新バケットは generatedAt で終わる 7 日窓。
 */
public record WeeklyTrendResponse(
        Long cohortId,
        OffsetDateTime generatedAt,
        List<WeekBucket> weeks
) {

    /** 1 週分（7 日窓）の集計。weekStart は窓の開始時刻 [weekStart, weekStart+7d)。 */
    public record WeekBucket(
            OffsetDateTime weekStart,
            long activeReviewers,
            long activePosters,
            long newPosts,
            long newReviews
    ) {}
}
