package com.reviewboard.domain.post;

import com.reviewboard.domain.auth.AuthCookies;
import com.reviewboard.domain.auth.RefreshTokenRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * F-POST の認可テスト（★S軸の中核。テスト計画書 §6 認可マトリクスの投稿部分）。
 *
 * <p>cohort A（所有者 a1・同 cohort の a2）と cohort B（b1）を用意し、
 * 所有者境界・cohort 境界・未認証を網羅する。他人/他 cohort は存在を漏らさず 404（IDOR 遮断）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class PostAuthorizationIntegrationTest {

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
    @Autowired PostRepository postRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PASSWORD = "correct-horse-battery";

    private String a1Email;  // cohort A・投稿の所有者
    private String a2Email;  // cohort A・別の受講生（非所有者）
    private String b1Email;  // cohort B・別 cohort

    @BeforeEach
    void setUp() {
        // FK 依存順に削除：posts/refresh_tokens(→users) を user より先に消す（テスト間分離）。
        postRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();

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
        // 同 cohort なので閲覧はできる
        mockMvc.perform(get("/api/posts/" + id).cookie(a2))
                .andExpect(status().isOk());
        // しかし他人の投稿は編集・削除不可（所有者でない → 404）
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

        // b1（cohort B）の一覧には A の投稿は出ない
        mockMvc.perform(get("/api/posts").cookie(login(b1Email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        // a2（cohort A）の一覧には出る
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
        // 論理削除後は本人でも取得不可（404）
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
        return com.jayway.jsonpath.JsonPath.parse(res.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();
    }

    private String body(String title) {
        return "{\"title\":\"" + title + "\",\"description\":\"説明文です\"}";
    }

    private Cookie login(String email) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie access = res.getResponse().getCookie(AuthCookies.ACCESS);
        assertThat(access).isNotNull();
        return access;
    }

    private Cohort newCohort(String name) {
        Cohort c = new Cohort();
        c.setName(name);
        c.setCreatedAt(OffsetDateTime.now());
        return cohortRepository.save(c);
    }

    private User newUser(String email, UserRole role, Long cohortId) {
        OffsetDateTime now = OffsetDateTime.now();
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(PASSWORD));
        u.setDisplayName(email);
        u.setRole(role);
        u.setCohortId(cohortId);
        u.setCreatedAt(now);
        u.setUpdatedAt(now);
        return userRepository.save(u);
    }
}
