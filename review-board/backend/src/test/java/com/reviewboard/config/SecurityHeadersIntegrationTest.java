package com.reviewboard.config;

import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-13：防御セキュリティヘッダが応答に付与されることを検証する。
 * （HSTS は HTTPS 応答にのみ付くため MockMvc では検証しない。nginx 側でも別途付与。）
 */
class SecurityHeadersIntegrationTest extends AbstractIntegrationTest {

    @Test
    void security_headers_are_present() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"))
                // 既定（埋め込みロック）では X-Frame-Options: DENY を維持する。
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }
}
