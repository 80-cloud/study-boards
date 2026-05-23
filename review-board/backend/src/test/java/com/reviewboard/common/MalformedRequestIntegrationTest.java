package com.reviewboard.common;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 不正な JSON ボディが 400 で返ること（#131 の回帰）。
 * 認証済みなのに 401 へ化ける（/error 再ディスパッチでセキュリティ再評価）退行を防ぐ。
 */
class MalformedRequestIntegrationTest extends AbstractIntegrationTest {

    private Cookie cookie;

    @BeforeEach
    void seed() throws Exception {
        var cohort = newCohort("A");
        String email = newUser("student@example.com", UserRole.STUDENT, cohort.getId()).getEmail();
        cookie = login(email);
    }

    /** enum に無い値（壊れた列挙）→ 400（401 ではない）。 */
    @Test
    void invalid_enum_value_returns400_not401() throws Exception {
        // ReviewAxis に存在しない "GOOD" を送る（実体は PERFORMANCE/CORRECTNESS/...）
        mockMvc.perform(post("/api/posts/1/reviews").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"good\":\"g\",\"improvement\":\"i\",\"axisComments\":[{\"axis\":\"GOOD\",\"comment\":\"x\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
    }

    /** 構文的に壊れた JSON → 400（401 ではない）。 */
    @Test
    void broken_json_returns400_not401() throws Exception {
        mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\": "))
                .andExpect(status().isBadRequest());
    }
}
