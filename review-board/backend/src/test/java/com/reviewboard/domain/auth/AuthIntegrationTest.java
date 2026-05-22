package com.reviewboard.domain.auth;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * F-AUTH の認可テスト（テスト計画書 §6 マトリクスの認証部分）。
 * Testcontainers PostgreSQL で本番同等の DB に対して検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("app.jwt.secret", () -> "test-secret-please-change-32chars-minimum");
    }

    @Autowired MockMvc mockMvc;
    @Autowired CohortRepository cohortRepository;
    @Autowired UserRepository userRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PASSWORD = "correct-horse-battery";

    @BeforeEach
    void setUp() {
        // refresh_tokens は users への FK を持つため、user より先に消す（テスト間の分離）。
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();
        OffsetDateTime now = OffsetDateTime.now();
        Cohort cohort = new Cohort();
        cohort.setName("test cohort");
        cohort.setCreatedAt(now);
        cohort = cohortRepository.save(cohort);

        User student = new User();
        student.setEmail("student@example.com");
        student.setPasswordHash(passwordEncoder.encode(PASSWORD));
        student.setDisplayName("受講生");
        student.setRole(UserRole.STUDENT);
        student.setCohortId(cohort.getId());
        student.setCreatedAt(now);
        student.setUpdatedAt(now);
        userRepository.save(student);
    }

    @Test
    void login_success_setsCookie_andMeReturnsUser() throws Exception {
        // 正常系：ログイン成功 → access_token Cookie 発行
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"student@example.com\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andReturn();

        Cookie access = result.getResponse().getCookie(AuthCookies.ACCESS);
        assertThat(access).isNotNull();
        assertThat(access.isHttpOnly()).isTrue();

        // その Cookie で /me が通る（認証済み）
        mockMvc.perform(get("/api/auth/me").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"student@example.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withoutCookie_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
