package com.reviewboard.domain.notification;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F-NOTIF-01 通知の生成・取得・既読化・認可テスト（S軸標準：受信者本人のみ＋拒否系）。
 */
class NotificationIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;     // 投稿者（レビューを受ける＝REVIEW_RECEIVED の受信者）
    private String reviewerEmail;   // レビュアー（ありがとうを受ける＝THANKS_RECEIVED の受信者）
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

    /** レビュー作成で投稿者に REVIEW_RECEIVED 通知が1件付く。 */
    @Test
    void review_creates_notification_for_author() throws Exception {
        mockMvc.perform(get("/api/notifications").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("REVIEW_RECEIVED"))
                .andExpect(jsonPath("$[0].postId").value((int) postId))
                .andExpect(jsonPath("$[0].read").value(false));

        mockMvc.perform(get("/api/notifications/unread-count").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    /** ありがとうでレビュアーに THANKS_RECEIVED 通知が付く。 */
    @Test
    void thanks_creates_notification_for_reviewer() throws Exception {
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(login(authorEmail)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type=='THANKS_RECEIVED')].length()").exists())
                .andExpect(jsonPath("$[0].type").value("THANKS_RECEIVED"))
                .andExpect(jsonPath("$[0].reviewId").value((int) reviewId));
    }

    /** 自分の投稿に自己レビューはできないため、自己通知は発生しない（recipient==actor のスキップは notify 側でも担保）。 */
    @Test
    void reviewer_has_no_notification_from_own_action() throws Exception {
        // レビュアー自身には REVIEW_RECEIVED は来ない（来るのは投稿者）
        mockMvc.perform(get("/api/notifications").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /** 既読化すると未読数が減る。自分の通知のみ。 */
    @Test
    void mark_read_decrements_unread() throws Exception {
        Cookie author = login(authorEmail);
        MvcResult res = mockMvc.perform(get("/api/notifications").cookie(author))
                .andExpect(status().isOk()).andReturn();
        long notifId = com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$[0].id", Integer.class).longValue();

        mockMvc.perform(post("/api/notifications/" + notifId + "/read").cookie(author))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/notifications/unread-count").cookie(author))
                .andExpect(jsonPath("$.count").value(0));
    }

    /** ★他人の通知は既読化できない（存在を漏らさず 404）。 */
    @Test
    void cannot_mark_others_notification_returns404() throws Exception {
        MvcResult res = mockMvc.perform(get("/api/notifications").cookie(login(authorEmail)))
                .andExpect(status().isOk()).andReturn();
        long authorsNotif = com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$[0].id", Integer.class).longValue();

        // レビュアーが投稿者の通知を既読化しようとする → 404
        mockMvc.perform(post("/api/notifications/" + authorsNotif + "/read").cookie(login(reviewerEmail)))
                .andExpect(status().isNotFound());
    }

    /** read-all で自分の未読が全て既読になる。 */
    @Test
    void mark_all_read() throws Exception {
        Cookie author = login(authorEmail);
        mockMvc.perform(post("/api/notifications/read-all").cookie(author))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/notifications/unread-count").cookie(author))
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(get("/api/notifications"))
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
}
