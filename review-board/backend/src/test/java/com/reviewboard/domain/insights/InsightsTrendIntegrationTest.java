package com.reviewboard.domain.insights;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.review.Review;
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
 * 週次トレンド API（#275）の認可と週バケット集計の正しさ。
 * 講師200 / 受講生403 / 未認証401・自 cohort のみ。タイムスタンプを作り込み、
 * 7 日バケットに正しく振り分けられることを確定値で検証する。
 */
class InsightsTrendIntegrationTest extends AbstractIntegrationTest {

    private Cookie teacher;
    private String studentEmail;

    @BeforeEach
    void seed() throws Exception {
        var a = newCohort("A");
        User teacherA = newUser("teacherA@example.com", UserRole.TEACHER, a.getId());
        User s1 = newUser("s1@example.com", UserRole.STUDENT, a.getId());
        User s2 = newUser("s2@example.com", UserRole.STUDENT, a.getId());
        studentEmail = s1.getEmail();

        OffsetDateTime now = OffsetDateTime.now();
        // 最新週 [now-7d, now)：投稿1・レビュー1
        long p1 = post(s1.getId(), a.getId(), now.minusDays(2));
        review(p1, s2.getId(), now.minusDays(1));
        // 2番目に新しい週 [now-14d, now-7d)：投稿1のみ（レビューなし）
        post(s1.getId(), a.getId(), now.minusDays(10));

        teacher = login(teacherA.getEmail());
    }

    @Test
    void trend_returns_requested_number_of_weekly_buckets() throws Exception {
        mockMvc.perform(get("/api/insights/engagement/trend").cookie(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeks.length()").value(8)); // 既定8週
        mockMvc.perform(get("/api/insights/engagement/trend").param("weeks", "4").cookie(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeks.length()").value(4));
    }

    @Test
    void trend_buckets_aggregate_by_period_correctly() throws Exception {
        // weeks=8：index7=最新週・index6=その前の週。
        mockMvc.perform(get("/api/insights/engagement/trend").cookie(teacher))
                .andExpect(status().isOk())
                // 最新週：投稿1・レビュー1・投稿者1・レビュアー1
                .andExpect(jsonPath("$.weeks[7].newPosts").value(1))
                .andExpect(jsonPath("$.weeks[7].newReviews").value(1))
                .andExpect(jsonPath("$.weeks[7].activePosters").value(1))
                .andExpect(jsonPath("$.weeks[7].activeReviewers").value(1))
                // 前の週：投稿1・レビュー0
                .andExpect(jsonPath("$.weeks[6].newPosts").value(1))
                .andExpect(jsonPath("$.weeks[6].newReviews").value(0));
    }

    @Test
    void student_is_forbidden_returns403() throws Exception {
        mockMvc.perform(get("/api/insights/engagement/trend").cookie(login(studentEmail)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(get("/api/insights/engagement/trend"))
                .andExpect(status().isUnauthorized());
    }

    private long post(Long author, Long cohort, OffsetDateTime createdAt) {
        Post p = new Post();
        p.setAuthorUserId(author);
        p.setCohortId(cohort);
        p.setTitle("作品");
        p.setDescription("説明");
        p.setReviewCount(0);
        p.setCreatedAt(createdAt);
        p.setUpdatedAt(createdAt);
        return postRepository.save(p).getId();
    }

    private void review(long postId, Long reviewer, OffsetDateTime createdAt) {
        Review r = new Review();
        r.setPostId(postId);
        r.setReviewerUserId(reviewer);
        r.setGood("良い点");
        r.setImprovement("改善点");
        r.setCreatedAt(createdAt);
        r.setUpdatedAt(createdAt);
        reviewRepository.save(r);
    }
}
