package com.reviewboard.domain.review;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * cohort 全体のレビュー一覧（#210・GET /api/reviews）の検証。
 * ★セキュリティ：自 cohort の投稿に付いたレビューだけを返し、他 cohort のレビューは漏らさない（越境しない）。
 */
class CohortReviewListIntegrationTest extends AbstractIntegrationTest {

    private String authorAEmail;    // cohort A・投稿者
    private String reviewerAEmail;  // cohort A・レビュアー
    private String authorBEmail;    // cohort B・投稿者
    private String reviewerBEmail;  // cohort B・レビュアー
    private long postA;             // cohort A の投稿
    private long postB;             // cohort B の投稿

    @BeforeEach
    void seed() throws Exception {
        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        authorAEmail = newUser("author-a@example.com", UserRole.STUDENT, a.getId()).getEmail();
        reviewerAEmail = newUser("reviewer-a@example.com", UserRole.STUDENT, a.getId()).getEmail();
        authorBEmail = newUser("author-b@example.com", UserRole.STUDENT, b.getId()).getEmail();
        reviewerBEmail = newUser("reviewer-b@example.com", UserRole.STUDENT, b.getId()).getEmail();

        postA = createPost(authorAEmail, "A の作品");
        postB = createPost(authorBEmail, "B の作品");
        // それぞれの cohort 内でレビューを付ける
        createReview(reviewerAEmail, postA);
        createReview(reviewerBEmail, postB);
    }

    /** 自 cohort のレビューだけが、投稿タイトル付きで返る。 */
    @Test
    void returns_reviews_within_own_cohort_with_post_title() throws Exception {
        mockMvc.perform(get("/api/reviews").cookie(login(reviewerAEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].postId").value((int) postA))
                .andExpect(jsonPath("$[0].postTitle").value("A の作品"))
                .andExpect(jsonPath("$[0].good").value("よい"));
    }

    /** ★セキュリティ：他 cohort のレビューは一覧に漏れない。 */
    @Test
    void does_not_leak_other_cohort_reviews() throws Exception {
        mockMvc.perform(get("/api/reviews").cookie(login(reviewerBEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].postId").value((int) postB))
                .andExpect(jsonPath("$[?(@.postTitle == 'A の作品')]").doesNotExist());
    }

    /** 未認証は 401。 */
    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(get("/api/reviews"))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createPost(String email, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(email))
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private void createReview(String email, long postId) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(login(email))
                        .contentType("application/json")
                        .content("{\"good\":\"よい\",\"improvement\":\"改善案\"}"))
                .andExpect(status().isCreated());
    }
}
