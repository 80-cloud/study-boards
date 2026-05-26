package com.reviewboard.domain.me;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 自分のデータのエクスポート（#261）。本人のデータのみ・機密を含まない・未認証 401 を検証する。
 */
class DataExportIntegrationTest extends AbstractIntegrationTest {

    private String emailA;
    private String emailB;

    @BeforeEach
    void seed() throws Exception {
        var a = newCohort("A");
        emailA = newUser("a@example.com", UserRole.STUDENT, a.getId()).getEmail();
        emailB = newUser("b@example.com", UserRole.STUDENT, a.getId()).getEmail();

        // A は自分の投稿を作る。B も投稿し、A はその B の投稿にレビューを書く。
        createPost(login(emailA), "Aの作品");
        long postB = createPost(login(emailB), "Bの作品");
        mockMvc.perform(post("/api/posts/" + postB + "/reviews").cookie(login(emailA))
                        .contentType("application/json")
                        .content("{\"good\":\"いいね\",\"improvement\":\"ここ直そう\"}"))
                .andExpect(status().isCreated());
    }

    /** 本人の投稿・レビューが含まれ、他人の投稿は含まれない。機密は含まれない。 */
    @Test
    void export_contains_own_data_only() throws Exception {
        mockMvc.perform(get("/api/me/export").cookie(login(emailA)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(jsonPath("$.profile.email").value(emailA))
                // 機密はそもそも DTO に存在しない。
                .andExpect(jsonPath("$.profile.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.profile.totpSecret").doesNotExist())
                // 自分の投稿は 1 件（Aの作品）。Bの作品は含まれない。
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].title").value("Aの作品"))
                // 自分が書いたレビューは 1 件。
                .andExpect(jsonPath("$.reviews.length()").value(1))
                .andExpect(jsonPath("$.reviews[0].good").value("いいね"));
    }

    /** B の export には B の投稿のみ・A のレビューは含まれない。 */
    @Test
    void export_is_scoped_per_user() throws Exception {
        mockMvc.perform(get("/api/me/export").cookie(login(emailB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.email").value(emailB))
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].title").value("Bの作品"))
                .andExpect(jsonPath("$.reviews.length()").value(0));
    }

    /** 未認証は 401。 */
    @Test
    void unauthenticated_is_401() throws Exception {
        mockMvc.perform(get("/api/me/export")).andExpect(status().isUnauthorized());
    }

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
