package com.reviewboard.domain.auth;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 継ぎ目テスト：{@code app.auth.bearer-enabled=true} に<b>切り替えたとき</b>、
 * Cookie 無しでも Authorization: Bearer で認証できることを実証する。
 * 外部連携(A)/組み込み(B) を「いつでも解放できる」状態であることの担保。
 */
@TestPropertySource(properties = "app.auth.bearer-enabled=true")
class BearerSeamEnabledTest extends AbstractIntegrationTest {

    @BeforeEach
    void seed() {
        Cohort cohort = newCohort("seam cohort");
        newUser("student@example.com", UserRole.STUDENT, cohort.getId());
    }

    @Test
    void bearerHeader_authenticates_whenEnabled() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"student@example.com\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = login.getResponse().getCookie(AuthCookies.ACCESS).getValue();

        // Cookie を付けず Bearer のみ → フラグ ON のため認証成功（200）。
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }
}
