package com.reviewboard.domain.review;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F-GROW-01 成長ループ管理の認可テスト（セキュリティ標準：cohort 境界＋投稿者限定＋拒否系）。
 * 対応状態を更新できるのは投稿者本人のみ。レビュアー含む他人は 403、他 cohort は 404。
 */
class GrowthAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;     // cohort A・投稿者
    private String reviewerEmail;   // cohort A・レビュアー
    private String outsiderEmail;   // cohort B
    private long postId;
    private long reviewId;

    @BeforeEach
    void seed() throws Exception {
        var cohortA = newCohort("A");
        var cohortB = newCohort("B");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, cohortA.getId()).getEmail();
        reviewerEmail = newUser("reviewer@example.com", UserRole.STUDENT, cohortA.getId()).getEmail();
        outsiderEmail = newUser("out@example.com", UserRole.STUDENT, cohortB.getId()).getEmail();

        postId = createPost(login(authorEmail));
        reviewId = createReview(login(reviewerEmail), postId);
    }

    /** 既定の対応状態は OPEN（未対応）。 */
    @Test
    void default_growth_status_is_open() throws Exception {
        mockMvc.perform(get("/api/posts/" + postId + "/reviews").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].growthStatus").value("OPEN"))
                .andExpect(jsonPath("$[0].beforeAfter").doesNotExist());
    }

    /** 投稿者は状態＋Before-After を更新できる。 */
    @Test
    void author_can_update_growth() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"status\":\"FIXED\",\"beforeAfter\":\"指摘の通り例外処理を共通化しました\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.growthStatus").value("FIXED"))
                .andExpect(jsonPath("$.beforeAfter").value("指摘の通り例外処理を共通化しました"));

        // 一覧でも反映される
        mockMvc.perform(get("/api/posts/" + postId + "/reviews").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].growthStatus").value("FIXED"));
    }

    /** ★レビュアー（投稿者以外）は更新できない（403）。 */
    @Test
    void reviewer_cannot_update_growth_returns403() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth").cookie(login(reviewerEmail))
                        .contentType("application/json")
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isForbidden());
    }

    /** 他 cohort からはレビュー先の投稿が不可視（404）。 */
    @Test
    void other_cohort_cannot_update_returns404() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth").cookie(login(outsiderEmail))
                        .contentType("application/json")
                        .content("{\"status\":\"FIXED\"}"))
                .andExpect(status().isNotFound());
    }

    /** 未認証は 401。 */
    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth")
                        .contentType("application/json").content("{\"status\":\"FIXED\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** 不正な enum 値は 400。 */
    @Test
    void invalid_status_returns400() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth").cookie(login(authorEmail))
                        .contentType("application/json").content("{\"status\":\"NOPE\"}"))
                .andExpect(status().isBadRequest());
    }

    /** status 欠落（null）は 400（@NotNull）。 */
    @Test
    void missing_status_returns400() throws Exception {
        mockMvc.perform(put("/api/reviews/" + reviewId + "/growth").cookie(login(authorEmail))
                        .contentType("application/json").content("{\"beforeAfter\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    private long createPost(Cookie cookie) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json").content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private long createReview(Cookie cookie, long pid) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts/" + pid + "/reviews").cookie(cookie)
                        .contentType("application/json").content("{\"good\":\"良い\",\"improvement\":\"改善\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
