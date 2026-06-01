package com.reviewboard.domain.review;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F-REV-04 返信スレッドの認可テスト（セキュリティ標準：cohort 境界＋所有者＋拒否系）。
 */
class ReplyAuthorizationIntegrationTest extends AbstractIntegrationTest {

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

    @Test
    void cohort_member_can_reply_and_list() throws Exception {
        // 投稿者が返信できる（同 cohort なら誰でも可）
        mockMvc.perform(post("/api/reviews/" + reviewId + "/replies").cookie(login(authorEmail))
                        .contentType("application/json").content("{\"body\":\"ありがとうございます\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("ありがとうございます"));
        // レビュアーも返信できる
        mockMvc.perform(post("/api/reviews/" + reviewId + "/replies").cookie(login(reviewerEmail))
                        .contentType("application/json").content("{\"body\":\"こちらこそ\"}"))
                .andExpect(status().isCreated());
        // 一覧は古い順で2件
        mockMvc.perform(get("/api/reviews/" + reviewId + "/replies").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].body").value("ありがとうございます"));
    }

    /** ★他 cohort はレビューが不可視＝返信できない（404）。 */
    @Test
    void other_cohort_cannot_reply_returns404() throws Exception {
        mockMvc.perform(post("/api/reviews/" + reviewId + "/replies").cookie(login(outsiderEmail))
                        .contentType("application/json").content("{\"body\":\"侵入\"}"))
                .andExpect(status().isNotFound());
    }

    /** 他 cohort は一覧も不可視（404）。 */
    @Test
    void other_cohort_cannot_list_returns404() throws Exception {
        mockMvc.perform(get("/api/reviews/" + reviewId + "/replies").cookie(login(outsiderEmail)))
                .andExpect(status().isNotFound());
    }

    /** 返信は本人のみ削除可（他人は 404）。 */
    @Test
    void only_owner_can_delete_reply() throws Exception {
        long replyId = createReply(login(authorEmail), reviewId, "消す予定");
        // 他人（レビュアー）は削除不可
        mockMvc.perform(delete("/api/replies/" + replyId).cookie(login(reviewerEmail)))
                .andExpect(status().isNotFound());
        // 本人は削除可
        mockMvc.perform(delete("/api/replies/" + replyId).cookie(login(authorEmail)))
                .andExpect(status().isNoContent());
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(post("/api/reviews/" + reviewId + "/replies")
                        .contentType("application/json").content("{\"body\":\"x\"}"))
                .andExpect(status().isUnauthorized());
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

    private long createReply(Cookie cookie, long rid, String body) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/reviews/" + rid + "/replies").cookie(cookie)
                        .contentType("application/json").content("{\"body\":\"" + body + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
