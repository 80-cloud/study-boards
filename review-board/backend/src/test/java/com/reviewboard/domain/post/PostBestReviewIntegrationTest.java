package com.reviewboard.domain.post;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F-REV-05 ベストレビュー選択の認可テスト（セキュリティ標準：所有者のみ＋拒否系）。
 */
class PostBestReviewIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;
    private String reviewerEmail;
    private long postId;
    private long reviewId;

    @BeforeEach
    void seed() throws Exception {
        var cohort = newCohort("A");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, cohort.getId()).getEmail();
        reviewerEmail = newUser("reviewer@example.com", UserRole.STUDENT, cohort.getId()).getEmail();

        postId = createPost(login(authorEmail));
        reviewId = createReview(login(reviewerEmail), postId);
    }

    @Test
    void author_can_select_best_review() throws Exception {
        mockMvc.perform(put("/api/posts/" + postId + "/best-review").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"reviewId\":" + reviewId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bestReviewId").value((int) reviewId));
    }

    /** ★投稿者以外は選べない（存在を漏らさず 404）。 */
    @Test
    void non_author_cannot_select_returns404() throws Exception {
        mockMvc.perform(put("/api/posts/" + postId + "/best-review").cookie(login(reviewerEmail))
                        .contentType("application/json")
                        .content("{\"reviewId\":" + reviewId + "}"))
                .andExpect(status().isNotFound());
    }

    /** 他 cohort からは投稿自体が不可視（404）。 */
    @Test
    void other_cohort_cannot_select_returns404() throws Exception {
        var cohortB = newCohort("B");
        String outsider = newUser("out@example.com", UserRole.STUDENT, cohortB.getId()).getEmail();
        mockMvc.perform(put("/api/posts/" + postId + "/best-review").cookie(login(outsider))
                        .contentType("application/json")
                        .content("{\"reviewId\":" + reviewId + "}"))
                .andExpect(status().isNotFound());
    }

    /** 別投稿のレビュー ID は弾く（400）。 */
    @Test
    void review_from_other_post_is_rejected_returns400() throws Exception {
        long otherPost = createPost(login(authorEmail));
        mockMvc.perform(put("/api/posts/" + otherPost + "/best-review").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"reviewId\":" + reviewId + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(put("/api/posts/" + postId + "/best-review")
                        .contentType("application/json")
                        .content("{\"reviewId\":" + reviewId + "}"))
                .andExpect(status().isUnauthorized());
    }

    private long createPost(Cookie cookie) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private long createReview(Cookie cookie, long pid) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts/" + pid + "/reviews").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"good\":\"良い\",\"improvement\":\"改善\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
