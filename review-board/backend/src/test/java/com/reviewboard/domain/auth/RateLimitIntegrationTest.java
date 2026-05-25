package com.reviewboard.domain.auth;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-12：ログイン試行レートリミット。窓内で上限を超えると 429 を返すことを検証する。
 * （他テストへ影響しないよう、フィルタ状態は AbstractIntegrationTest の @BeforeEach で都度クリア）
 */
class RateLimitIntegrationTest extends AbstractIntegrationTest {

    @BeforeEach
    void seed() {
        Cohort a = newCohort("A");
        newUser("rl@example.com", UserRole.STUDENT, a.getId());
    }

    /** login-max=20。誤パスワードでも試行はカウントされ、上限超過で 429。 */
    @Test
    void login_is_rate_limited_after_threshold() throws Exception {
        String badLogin = "{\"email\":\"rl@example.com\",\"password\":\"wrong-password\"}";
        // 上限（20）までは 401（認証失敗）。
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/auth/login").contentType("application/json").content(badLogin))
                    .andExpect(status().isUnauthorized());
        }
        // 21 回目は 429（レートリミット）。
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(badLogin))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    /** 正しい資格情報でも、窓内の試行回数として上限を超えれば 429（総当たり後の正答も弾く）。 */
    @Test
    void over_limit_blocks_even_valid_credentials() throws Exception {
        String good = "{\"email\":\"rl@example.com\",\"password\":\"" + PASSWORD + "\"}";
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/auth/login").contentType("application/json").content(good))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(good))
                .andExpect(status().isTooManyRequests());
    }
}
