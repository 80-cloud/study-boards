package com.reviewboard.domain.insights;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewAxis;
import com.reviewboard.domain.review.ReviewAxisComment;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * エンゲージメント指標の「正しさ」検証（#273）。
 * タイムスタンプを作り込んで網羅率・ttfr・週次アクティブ・質指標・停滞者を確定値で検証する。
 *
 * <p>データ設計（cohort A・now 基準）：投稿5件中3件レビュー済み（網羅率0.6・未レビュー2）。
 * ttfr は 2h/4h/10h（median=4・p95=10・avg=5.33）。直近7日のレビュアー distinct=2。
 */
class EngagementMetricsIntegrationTest extends AbstractIntegrationTest {

    private Cookie teacher;
    private long s1Id;
    private long s4Id;

    @BeforeEach
    void seed() throws Exception {
        var a = newCohort("A");
        User teacherA = newUser("teacherA@example.com", UserRole.TEACHER, a.getId());
        User s1 = newUser("s1@example.com", UserRole.STUDENT, a.getId());
        User s2 = newUser("s2@example.com", UserRole.STUDENT, a.getId());
        User s3 = newUser("s3@example.com", UserRole.STUDENT, a.getId());
        User s4 = newUser("s4@example.com", UserRole.STUDENT, a.getId()); // 活動皆無＝停滞者
        s1Id = s1.getId();
        s4Id = s4.getId();

        OffsetDateTime now = OffsetDateTime.now();

        // 投稿5件（全て直近30日内）。reviewCount は非正規化カウンタとして明示設定。
        long p1 = post(s1.getId(), a.getId(), now.minusDays(5), 1);
        long p2 = post(s1.getId(), a.getId(), now.minusDays(4), 1);
        long p3 = post(s2.getId(), a.getId(), now.minusDays(3), 1);
        post(s2.getId(), a.getId(), now.minusDays(2), 0); // 未レビュー（最古待機48h）
        post(s3.getId(), a.getId(), now.minusDays(1), 0); // 未レビュー（待機24h）

        // レビュー3件（ttfr=2h/4h/10h・全て直近7日内）。
        long r1 = review(p1, s2.getId(), now.minusDays(5).plusHours(2), 2);  // thanks>0
        long r2 = review(p2, s3.getId(), now.minusDays(4).plusHours(4), 0);
        long r3 = review(p3, s3.getId(), now.minusDays(3).plusHours(10), 1); // thanks>0

        // 観点コメント：r1=2件・r2=1件・r3=0件 → 計3件 / レビュー3件 = avg 1.0
        axis(r1, ReviewAxis.CORRECTNESS);
        axis(r1, ReviewAxis.SECURITY);
        axis(r2, ReviewAxis.PERFORMANCE);

        // ベスト選出：p1 が r1 を選ぶ → bestSelectedCount=1
        Post p1e = postRepository.findById(p1).orElseThrow();
        p1e.setBestReviewId(r1);
        postRepository.save(p1e);

        teacher = login(teacherA.getEmail());
    }

    @Test
    void engagement_metrics_are_computed_correctly() throws Exception {
        mockMvc.perform(get("/api/insights/engagement").cookie(teacher))
                .andExpect(status().isOk())
                // メンバー：ACTIVE 5（講師1・受講生4）
                .andExpect(jsonPath("$.members.active").value(5))
                .andExpect(jsonPath("$.members.students").value(4))
                .andExpect(jsonPath("$.members.teachers").value(1))
                // 投稿：総数5・直近7日5・未レビュー2
                .andExpect(jsonPath("$.posts.total").value(5))
                .andExpect(jsonPath("$.posts.last7d").value(5))
                .andExpect(jsonPath("$.posts.unreviewed").value(2))
                // レビュー：総数3・直近7日3
                .andExpect(jsonPath("$.reviews.total").value(3))
                .andExpect(jsonPath("$.reviews.last7d").value(3))
                // 網羅率 0.6
                .andExpect(jsonPath("$.reviewCoverageRate").value(0.6))
                // ttfr：median4・p95=10・avg≈5.33・待機2件・最古48h
                .andExpect(jsonPath("$.timeToFirstReview.sampleCount").value(3))
                .andExpect(jsonPath("$.timeToFirstReview.medianHours").value(4.0))
                .andExpect(jsonPath("$.timeToFirstReview.p95Hours").value(10.0))
                .andExpect(jsonPath("$.timeToFirstReview.avgHours").value(5.33))
                .andExpect(jsonPath("$.timeToFirstReview.awaitingCount").value(2))
                .andExpect(jsonPath("$.timeToFirstReview.oldestAwaitingHours").value(48.0))
                // 週次アクティブ：レビュアー2（S2/S3）・率0.4・投稿者3（S1/S2/S3）
                .andExpect(jsonPath("$.weeklyActiveReviewers").value(2))
                .andExpect(jsonPath("$.weeklyActiveReviewerRate").value(0.4))
                .andExpect(jsonPath("$.weeklyActivePosters").value(3))
                // 質指標：avg観点1.0・🙏率0.6667・ベスト1
                .andExpect(jsonPath("$.quality.avgAspectsPerReview").value(1.0))
                .andExpect(jsonPath("$.quality.thanksRate").value(0.6667))
                .andExpect(jsonPath("$.quality.bestSelectedCount").value(1));
    }

    @Test
    void stagnant_lists_inactive_member_and_excludes_active_one() throws Exception {
        // S4（活動皆無）は停滞者に出る。S1（直近に投稿）は出ない。
        mockMvc.perform(get("/api/insights/engagement").cookie(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stagnantMembers[?(@.userId == " + s4Id + ")]").exists())
                .andExpect(jsonPath("$.stagnantMembers[?(@.userId == " + s1Id + ")]").doesNotExist());
    }

    @Test
    void days_param_widens_stagnant_window() throws Exception {
        // days=1 にすると、最終活動が1日より前の S1 等も停滞扱いになる（窓が効いている証拠）。
        mockMvc.perform(get("/api/insights/engagement").param("days", "1").cookie(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stagnantMembers[?(@.userId == " + s1Id + ")]").exists());
    }

    // ---- タイムスタンプを作り込むためエンティティを直接生成（API は createdAt=now 固定のため） ----

    private long post(Long author, Long cohort, OffsetDateTime createdAt, int reviewCount) {
        Post p = new Post();
        p.setAuthorUserId(author);
        p.setCohortId(cohort);
        p.setTitle("作品");
        p.setDescription("説明");
        p.setReviewCount(reviewCount);
        p.setCreatedAt(createdAt);
        p.setUpdatedAt(createdAt);
        return postRepository.save(p).getId();
    }

    private long review(long postId, Long reviewer, OffsetDateTime createdAt, int thanks) {
        Review r = new Review();
        r.setPostId(postId);
        r.setReviewerUserId(reviewer);
        r.setGood("良い点");
        r.setImprovement("改善点");
        r.setThanksCount(thanks);
        r.setCreatedAt(createdAt);
        r.setUpdatedAt(createdAt);
        return reviewRepository.save(r).getId();
    }

    private void axis(long reviewId, ReviewAxis axis) {
        ReviewAxisComment c = new ReviewAxisComment();
        c.setReviewId(reviewId);
        c.setAxis(axis);
        c.setComment("観点コメント");
        axisCommentRepository.save(c);
    }
}
