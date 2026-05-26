package com.reviewboard.domain.insights.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * エンゲージメント指標（#273・運営限定・compute-on-read）。
 * cohort 単位の「使われ方」を運営（講師/管理者）が把握するための集計値。
 * 学生 UI には一切露出しない（非競争方針）。
 */
public record EngagementMetricsResponse(
        Long cohortId,
        OffsetDateTime generatedAt,
        Members members,
        Posts posts,
        Reviews reviews,
        double reviewCoverageRate,
        Ttfr timeToFirstReview,
        long weeklyActiveReviewers,
        double weeklyActiveReviewerRate,
        long weeklyActivePosters,
        Quality quality,
        List<StagnantMember> stagnantMembers
) {

    /** ACTIVE メンバーの内訳。 */
    public record Members(long active, long students, long teachers) {}

    /** 投稿の概況。last7d はローリング7日窓、unreviewed は review_count=0。 */
    public record Posts(long total, long last7d, long unreviewed) {}

    /** レビューの概況。 */
    public record Reviews(long total, long last7d) {}

    /**
     * time-to-first-review（直近30日の投稿対象）。percentile は Java 側算出（DB 非依存）。
     * <ul>
     *   <li>{@code sampleCount}：レビュー済み投稿の件数（median/p95/avg の母数）。0 のとき各 hours は null。</li>
     *   <li>{@code awaitingCount}：直近30日の未レビュー投稿数、{@code oldestAwaitingHours} はその最古の待機時間。</li>
     * </ul>
     */
    public record Ttfr(int sampleCount, Double medianHours, Double p95Hours, Double avgHours,
                       long awaitingCount, Double oldestAwaitingHours) {}

    /** 質指標（任意）：avg観点数/レビュー・🙏率・ベスト選出数。 */
    public record Quality(double avgAspectsPerReview, double thanksRate, long bestSelectedCount) {}

    /**
     * 停滞メンバー（ケア対象）。直近 N 日に投稿もレビューも無い ACTIVE メンバー。
     * {@code lastActiveAt} は活動皆無のとき null（その場合 daysInactive はアカウント作成からの経過日数）。
     */
    public record StagnantMember(Long userId, String displayName, OffsetDateTime lastActiveAt, long daysInactive) {}
}
