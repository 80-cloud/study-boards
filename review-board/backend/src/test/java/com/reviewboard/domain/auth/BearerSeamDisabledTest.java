package com.reviewboard.domain.auth;

import com.reviewboard.domain.cohort.Cohort;
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
 * 継ぎ目テスト：Bearer 認証が <b>既定（app.auth.bearer-enabled 未設定＝false）</b> では
 * 一切効かず、現状（Cookie 認証のみ）と同一の挙動であることを保証する。
 * 「外部に開く仕込みを入れても、フラグ OFF の間は攻撃面を増やさない」ことの担保。
 */
class BearerSeamDisabledTest extends AbstractIntegrationTest {

    @BeforeEach
    void seed() {
        Cohort cohort = newCohort("seam cohort");
        newUser("student@example.com", UserRole.STUDENT, cohort.getId());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"student@example.com\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie(AuthCookies.ACCESS).getValue();
    }

    @Test
    void bearerHeader_isIgnored_byDefault() throws Exception {
        String token = loginAndGetAccessToken();
        // Cookie を付けず、有効なトークンを Bearer ヘッダだけで送る。
        // 既定では Authorization ヘッダを見ないため未認証＝401（現状の閉じた挙動）。
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cookie_stillAuthenticates_asBefore() throws Exception {
        String token = loginAndGetAccessToken();
        // Cookie 経路は従来どおり通る（後退が無いことの確認）。
        Cookie access = new Cookie(AuthCookies.ACCESS, token);
        mockMvc.perform(get("/api/auth/me").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }
}
