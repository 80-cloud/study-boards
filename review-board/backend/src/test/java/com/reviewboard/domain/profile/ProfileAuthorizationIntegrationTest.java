package com.reviewboard.domain.profile;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * F-PROF 成長記録ページの認可・集約テスト（★S軸・テスト計画書 §6）。
 * 投稿履歴/もらったレビュー(講師強調)/合格バッジ/したレビュー実績の集約と、
 * cohort 境界（他 cohort は 404）・未認証を検証する。
 */
class ProfileAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private long authorId;
    private long reviewerId;
    private String authorEmail;
    private String reviewerEmail;
    private String teacherEmail;
    private String bEmail;

    @BeforeEach
    void seed() throws Exception {
        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        User author = newUser("author@example.com", UserRole.STUDENT, a.getId());
        User reviewer = newUser("reviewer@example.com", UserRole.STUDENT, a.getId());
        authorId = author.getId();
        reviewerId = reviewer.getId();
        authorEmail = author.getEmail();
        reviewerEmail = reviewer.getEmail();
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId()).getEmail();
        bEmail = newUser("b@example.com", UserRole.STUDENT, b.getId()).getEmail();

        // author が投稿2件。post1 をレビュー(受講生+講師)・ありがとう・講師承認する
        Cookie authorCookie = login(authorEmail);
        long post1 = createPost(authorCookie, "作品1");
        createPost(authorCookie, "作品2");

        long studentReview = createReview(login(reviewerEmail), post1);
        createReview(login(teacherEmail), post1);                 // 講師レビュー
        thank(authorCookie, studentReview);                       // author が reviewer に感謝
        evaluate(login(teacherEmail), post1, "APPROVED", "合格");  // 合格バッジ
    }

    @Test
    void author_profile_aggregates_posts_received_reviews_and_badge() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(2))
                .andExpect(jsonPath("$.posts[?(@.title == '作品1')].approved").value(true))
                .andExpect(jsonPath("$.receivedReviews.length()").value(2))
                .andExpect(jsonPath("$.receivedReviews[?(@.teacherReview == true)].reviewerRole").value("TEACHER"))
                .andExpect(jsonPath("$.stats.receivedReviewsCount").value(2));
    }

    @Test
    void reviewer_profile_shows_given_stats_and_thanks() throws Exception {
        mockMvc.perform(get("/api/users/" + reviewerId + "/profile").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.givenReviewsCount").value(1))
                .andExpect(jsonPath("$.stats.thanksReceivedCount").value(1))
                .andExpect(jsonPath("$.posts.length()").value(0));
    }

    @Test
    void same_cohort_member_can_view_others_profile() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value((int) authorId));
    }

    @Test
    void other_cohort_cannot_view_profile_returns404() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(bEmail)))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile"))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private long createReview(Cookie cookie, long postId) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"good\":\"よい\",\"improvement\":\"改善\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private void thank(Cookie cookie, long reviewId) throws Exception {
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(cookie))
                .andExpect(status().isNoContent());
    }

    private void evaluate(Cookie cookie, long postId, String result, String comment) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"result\":\"" + result + "\",\"comment\":\"" + comment + "\"}"))
                .andExpect(status().isOk());
    }
}
