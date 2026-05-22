package com.reviewboard.domain.evaluation;

import com.reviewboard.domain.auth.AuthCookies;
import com.reviewboard.domain.auth.RefreshTokenRepository;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import com.jayway.jsonpath.JsonPath;
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
 * F-EVAL の認可テスト（★S軸の重点＝権限昇格防止）。
 * 受講生が講師限定の評価操作を呼べないこと（403）を中心に、cohort 境界・最新後勝ち＋履歴を検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EvaluationAuthorizationIntegrationTest {

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
    @Autowired EvaluationRepository evaluationRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PW = "correct-horse-battery";

    private String authorEmail;    // cohort A・受講生・投稿者
    private String teacherEmail;   // cohort A・講師
    private String teacherBEmail;  // cohort B・講師
    private long postId;

    @BeforeEach
    void setUp() throws Exception {
        evaluationRepository.deleteAll();
        postRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();

        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, a.getId());
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId());
        teacherBEmail = newUser("teacherB@example.com", UserRole.TEACHER, b.getId());

        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        postId = JsonPath.parse(res.getResponse().getContentAsString()).read("$.id", Integer.class);
    }

    @Test
    void teacher_can_evaluate_and_fetch_latest() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(teacherEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"合格です\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(true));

        mockMvc.perform(get("/api/posts/" + postId + "/evaluation").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("APPROVED"));
    }

    /** ★最重要：受講生は講師限定の評価操作を呼べない（権限昇格防止）。 */
    @Test
    void student_cannot_evaluate_returns403() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"自己承認の試み\"}"))
                .andExpect(status().isForbidden());

        // 評価は1件も作られていない
        assertThat(evaluationRepository.findByPostIdOrderByCreatedAtDesc(postId)).isEmpty();
    }

    @Test
    void new_evaluation_supersedes_and_keeps_history() throws Exception {
        Cookie teacher = login(teacherEmail);
        evaluate(teacher, "RETURNED", "差し戻し");
        evaluate(teacher, "APPROVED", "再提出を承認");

        // 最新は APPROVED（後勝ち）
        mockMvc.perform(get("/api/posts/" + postId + "/evaluation").cookie(teacher))
                .andExpect(jsonPath("$.result").value("APPROVED"));
        // 履歴は2件残る（母 S-4）
        assertThat(evaluationRepository.findByPostIdOrderByCreatedAtDesc(postId)).hasSize(2);
        assertThat(evaluationRepository.findByPostIdAndLatestIsTrue(postId)).isPresent();
    }

    @Test
    void teacher_of_other_cohort_cannot_evaluate_returns404() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(teacherBEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"他cohortから\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation")
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private void evaluate(Cookie teacher, String result, String comment) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(teacher)
                        .contentType("application/json")
                        .content("{\"result\":\"" + result + "\",\"comment\":\"" + comment + "\"}"))
                .andExpect(status().isOk());
    }

    private Cookie login(String email) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PW + "\"}"))
                .andExpect(status().isOk()).andReturn();
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

    private String newUser(String email, UserRole role, Long cohortId) {
        OffsetDateTime now = OffsetDateTime.now();
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(PW));
        u.setDisplayName(email);
        u.setRole(role);
        u.setCohortId(cohortId);
        u.setCreatedAt(now);
        u.setUpdatedAt(now);
        return userRepository.save(u).getEmail();
    }
}
