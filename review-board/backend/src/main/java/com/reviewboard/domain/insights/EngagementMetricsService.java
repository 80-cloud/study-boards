package com.reviewboard.domain.insights;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.Members;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.Posts;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.Quality;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.Reviews;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.StagnantMember;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse.Ttfr;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.ReviewAxisCommentRepository;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.domain.user.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * エンゲージメント指標の算出（#273・compute-on-read）。
 * すべて principal.cohortId に閉じる（S軸）。新規テーブル/バッチは持たず、既存テーブルの集計で都度算出する。
 */
@Service
public class EngagementMetricsService {

    /** 停滞判定の既定窓（日）。?days= で上書き可能。 */
    public static final int DEFAULT_STAGNANT_DAYS = 14;
    /** time-to-first-review のサンプル窓（直近30日の投稿対象）。 */
    private static final int TTFR_WINDOW_DAYS = 30;
    /** 週次アクティブ等のローリング窓。 */
    private static final int WEEKLY_WINDOW_DAYS = 7;

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewAxisCommentRepository axisCommentRepository;
    private final UserRepository userRepository;

    public EngagementMetricsService(PostRepository postRepository,
                                    ReviewRepository reviewRepository,
                                    ReviewAxisCommentRepository axisCommentRepository,
                                    UserRepository userRepository) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.axisCommentRepository = axisCommentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public EngagementMetricsResponse compute(AuthPrincipal principal, int stagnantDays) {
        Long cohortId = principal.cohortId();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime since7 = now.minusDays(WEEKLY_WINDOW_DAYS);
        OffsetDateTime since30 = now.minusDays(TTFR_WINDOW_DAYS);
        OffsetDateTime stagnantThreshold = now.minusDays(stagnantDays);

        // ---- メンバー ----
        List<User> activeMembers = userRepository.findByCohortIdAndStatus(cohortId, UserStatus.ACTIVE);
        long students = activeMembers.stream().filter(u -> u.getRole() == UserRole.STUDENT).count();
        long teachers = activeMembers.stream().filter(u -> u.getRole() == UserRole.TEACHER).count();
        Members members = new Members(activeMembers.size(), students, teachers);

        // ---- 投稿 ----
        long postsTotal = postRepository.countByCohortIdAndDeletedAtIsNull(cohortId);
        long postsLast7d = postRepository.countByCohortIdAndDeletedAtIsNullAndCreatedAtAfter(cohortId, since7);
        long unreviewed = postRepository.countByCohortIdAndDeletedAtIsNullAndReviewCount(cohortId, 0);
        Posts posts = new Posts(postsTotal, postsLast7d, unreviewed);
        double reviewCoverageRate = postsTotal == 0 ? 0.0 : round4((double) (postsTotal - unreviewed) / postsTotal);

        // ---- レビュー ----
        long reviewsTotal = reviewRepository.countReviewsInCohort(cohortId);
        long reviewsLast7d = reviewRepository.countReviewsInCohortSince(cohortId, since7);
        Reviews reviews = new Reviews(reviewsTotal, reviewsLast7d);

        // ---- time-to-first-review（Java 側で median/p95/avg を算出・DB 非依存） ----
        Ttfr ttfr = computeTtfr(cohortId, since30, now);

        // ---- 週次アクティブ ----
        long weeklyActiveReviewers = reviewRepository.countDistinctActiveReviewers(cohortId, since7);
        double weeklyActiveReviewerRate =
                activeMembers.isEmpty() ? 0.0 : round4((double) weeklyActiveReviewers / activeMembers.size());
        long weeklyActivePosters = postRepository.countDistinctActivePosters(cohortId, since7);

        // ---- 質指標 ----
        long axisComments = axisCommentRepository.countAxisCommentsInCohort(cohortId);
        long thankedReviews = reviewRepository.countThankedReviewsInCohort(cohortId);
        long bestSelected = postRepository.countByCohortIdAndDeletedAtIsNullAndBestReviewIdIsNotNull(cohortId);
        Quality quality = new Quality(
                reviewsTotal == 0 ? 0.0 : round4((double) axisComments / reviewsTotal),
                reviewsTotal == 0 ? 0.0 : round4((double) thankedReviews / reviewsTotal),
                bestSelected);

        // ---- 停滞メンバー ----
        List<StagnantMember> stagnant = computeStagnant(cohortId, activeMembers, stagnantThreshold, now);

        return new EngagementMetricsResponse(
                cohortId, now, members, posts, reviews, reviewCoverageRate, ttfr,
                weeklyActiveReviewers, weeklyActiveReviewerRate, weeklyActivePosters, quality, stagnant);
    }

    private Ttfr computeTtfr(Long cohortId, OffsetDateTime since30, OffsetDateTime now) {
        List<Object[]> rows = postRepository.firstReviewTimings(cohortId, since30);
        List<Double> reviewedHours = new ArrayList<>();
        long awaitingCount = 0;
        Double oldestAwaitingHours = null;
        for (Object[] row : rows) {
            OffsetDateTime postCreatedAt = (OffsetDateTime) row[1];
            OffsetDateTime firstReviewAt = (OffsetDateTime) row[2];
            if (firstReviewAt != null) {
                reviewedHours.add(hoursBetween(postCreatedAt, firstReviewAt));
            } else {
                awaitingCount++;
                double waiting = hoursBetween(postCreatedAt, now);
                if (oldestAwaitingHours == null || waiting > oldestAwaitingHours) {
                    oldestAwaitingHours = waiting;
                }
            }
        }
        reviewedHours.sort(Comparator.naturalOrder());
        Double median = percentile(reviewedHours, 0.50);
        Double p95 = percentile(reviewedHours, 0.95);
        Double avg = reviewedHours.isEmpty() ? null
                : round2(reviewedHours.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        return new Ttfr(reviewedHours.size(), median, p95, avg,
                awaitingCount, oldestAwaitingHours == null ? null : round2(oldestAwaitingHours));
    }

    private List<StagnantMember> computeStagnant(Long cohortId, List<User> activeMembers,
                                                 OffsetDateTime threshold, OffsetDateTime now) {
        Map<Long, OffsetDateTime> lastPost = toLastActiveMap(postRepository.lastPostAtByAuthor(cohortId));
        Map<Long, OffsetDateTime> lastReview = toLastActiveMap(reviewRepository.lastReviewAtByReviewer(cohortId));

        List<StagnantMember> result = new ArrayList<>();
        for (User m : activeMembers) {
            OffsetDateTime lastActiveAt = maxNullable(lastPost.get(m.getId()), lastReview.get(m.getId()));
            boolean stagnant = lastActiveAt == null || lastActiveAt.isBefore(threshold);
            if (!stagnant) {
                continue;
            }
            OffsetDateTime since = lastActiveAt != null ? lastActiveAt : m.getCreatedAt();
            long daysInactive = since == null ? 0 : ChronoUnit.DAYS.between(since, now);
            result.add(new StagnantMember(m.getId(), m.getDisplayName(), lastActiveAt, daysInactive));
        }
        result.sort(Comparator.comparingLong(StagnantMember::daysInactive).reversed());
        return result;
    }

    private Map<Long, OffsetDateTime> toLastActiveMap(List<Object[]> rows) {
        Map<Long, OffsetDateTime> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Long) row[0], (OffsetDateTime) row[1]);
        }
        return map;
    }

    private static OffsetDateTime maxNullable(OffsetDateTime a, OffsetDateTime b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.isAfter(b) ? a : b;
    }

    private static double hoursBetween(OffsetDateTime from, OffsetDateTime to) {
        return round2(Duration.between(from, to).toMinutes() / 60.0);
    }

    /** ソート済みリストから最近接ランク法で percentile を算出（空なら null）。 */
    private static Double percentile(List<Double> sorted, double q) {
        if (sorted.isEmpty()) {
            return null;
        }
        int n = sorted.size();
        int rank = (int) Math.ceil(q * n);
        int idx = Math.min(Math.max(rank - 1, 0), n - 1);
        return sorted.get(idx);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static double round4(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }
}
