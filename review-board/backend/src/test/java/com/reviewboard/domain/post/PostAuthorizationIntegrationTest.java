package com.reviewboard.domain.post;

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
 * F-POST の認可テスト（★S軸の中核。テスト計画書 §6 認可マトリクスの投稿部分）。
 *
 * <p>cohort A（所有者 a1・同 cohort の a2）と cohort B（b1）を用意し、
 * 所有者境界・cohort 境界・未認証を網羅する。他人/他 cohort は存在を漏らさず 404（IDOR 遮断）。
 */
class PostAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private String a1Email;  // cohort A・投稿の所有者
    private String a2Email;  // cohort A・別の受講生（非所有者）
    private String b1Email;  // cohort B・別 cohort

    @BeforeEach
    void seed() {
        Cohort a = newCohort("cohort A");
        Cohort b = newCohort("cohort B");
        a1Email = newUser("a1@example.com", UserRole.STUDENT, a.getId()).getEmail();
        a2Email = newUser("a2@example.com", UserRole.STUDENT, a.getId()).getEmail();
        b1Email = newUser("b1@example.com", UserRole.STUDENT, b.getId()).getEmail();
    }

    @Test
    void create_then_owner_can_get() throws Exception {
        Cookie a1 = login(a1Email);
        long id = createPost(a1, "私の成果物");

        mockMvc.perform(get("/api/posts/" + id).cookie(a1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("私の成果物"));
    }

    @Test
    void sameCohort_other_can_view_but_cannot_edit_or_delete() throws Exception {
        Cookie a1 = login(a1Email);
        long id = createPost(a1, "a1 の投稿");

        Cookie a2 = login(a2Email);
        mockMvc.perform(get("/api/posts/" + id).cookie(a2))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/posts/" + id).cookie(a2)
                        .contentType("application/json")
                        .content(body("乗っ取り編集")))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/posts/" + id).cookie(a2))
                .andExpect(status().isNotFound());
    }

    @Test
    void otherCohort_cannot_view_edit_or_delete() throws Exception {
        Cookie a1 = login(a1Email);
        long id = createPost(a1, "cohort A の投稿");

        Cookie b1 = login(b1Email);
        mockMvc.perform(get("/api/posts/" + id).cookie(b1))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/posts/" + id).cookie(b1)
                        .contentType("application/json")
                        .content(body("他 cohort 編集")))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/posts/" + id).cookie(b1))
                .andExpect(status().isNotFound());
    }

    @Test
    void list_returns_only_same_cohort() throws Exception {
        Cookie a1 = login(a1Email);
        createPost(a1, "A の投稿");

        mockMvc.perform(get("/api/posts").cookie(login(b1Email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/posts").cookie(login(a2Email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void owner_can_update_and_logical_delete() throws Exception {
        Cookie a1 = login(a1Email);
        long id = createPost(a1, "編集前");

        mockMvc.perform(put("/api/posts/" + id).cookie(a1)
                        .contentType("application/json")
                        .content(body("編集後")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("編集後"));

        mockMvc.perform(delete("/api/posts/" + id).cookie(a1))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/posts/" + id).cookie(a1))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType("application/json")
                        .content(body("未ログイン投稿")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content(body(title)))
                .andExpect(status().isCreated())
                .andReturn();
        return readId(res);
    }

    private String body(String title) {
        return "{\"title\":\"" + title + "\",\"description\":\"説明文です\"}";
    }
}
