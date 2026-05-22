package com.reviewboard.domain.review;

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
 * F-REV の認可テスト（★S軸・テスト計画書 §6）。
 * cohort 境界・自己レビュー禁止・所有者・ありがとう権限（投稿者のみ・冪等）を網羅する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ReviewAuthorizationIntegrationTest {

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
    @Autowired ReviewRepository reviewRepository;
    @Autowired ReviewAxisCommentRepository axisCommentRepository;
    @Autowired ThanksRepository thanksRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PW = "correct-horse-battery";

    private String authorEmail;   // cohort A・投稿の所有者
    private String reviewerEmail; // cohort A・レビュアー
    private String otherEmail;    // cohort A・第三者
    private String teacherEmail;  // cohort A・講師
    private String bEmail;        // cohort B
    private long postId;          // author の投稿

    @BeforeEach
    void setUp() throws Exception {
        // FK 依存順に削除
        thanksRepository.deleteAll();
        axisCommentRepository.deleteAll();
        reviewRepository.deleteAll();
        postRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();

        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, a.getId());
        reviewerEmail = newUser("reviewer@example.com", UserRole.STUDENT, a.getId());
        otherEmail = newUser("other@example.com", UserRole.STUDENT, a.getId());
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId());
        bEmail = newUser("b@example.com", UserRole.STUDENT, b.getId());

        // author が投稿を1件作る
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        postId = readId(res);
    }

    @Test
    void reviewer_can_create_and_list_shows_it() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(login(reviewerEmail))
                        .contentType("application/json")
                        .content(reviewBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.good").value("よい"));

        mockMvc.perform(get("/api/posts/" + postId + "/reviews").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].axisComments.length()").value(1));
    }

    @Test
    void self_review_is_rejected() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content(reviewBody()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void other_cohort_cannot_review_or_list() throws Exception {
        Cookie b = login(bEmail);
        mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(b)
                        .contentType("application/json")
                        .content(reviewBody()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/posts/" + postId + "/reviews").cookie(b))
                .andExpect(status().isNotFound());
    }

    @Test
    void teacher_review_is_flagged() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(login(teacherEmail))
                        .contentType("application/json")
                        .content(reviewBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewerRole").value("TEACHER"))
                .andExpect(jsonPath("$.teacherReview").value(true));
    }

    @Test
    void non_owner_cannot_edit_or_delete_review() throws Exception {
        long reviewId = createReview(reviewerEmail);
        Cookie other = login(otherEmail);
        mockMvc.perform(put("/api/reviews/" + reviewId).cookie(other)
                        .contentType("application/json").content(reviewBody()))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/reviews/" + reviewId).cookie(other))
                .andExpect(status().isNotFound());
    }

    @Test
    void owner_can_edit_and_delete_review() throws Exception {
        long reviewId = createReview(reviewerEmail);
        Cookie reviewer = login(reviewerEmail);
        mockMvc.perform(put("/api/reviews/" + reviewId).cookie(reviewer)
                        .contentType("application/json")
                        .content("{\"good\":\"更新\",\"improvement\":\"改善\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.good").value("更新"));
        mockMvc.perform(delete("/api/reviews/" + reviewId).cookie(reviewer))
                .andExpect(status().isNoContent());
    }

    @Test
    void thanks_only_by_post_author_and_idempotent() throws Exception {
        long reviewId = createReview(reviewerEmail);

        // 第三者は不可（投稿者でない）→ 403
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(login(otherEmail)))
                .andExpect(status().isForbidden());

        // 投稿者は可、2回送っても冪等（thanksCount は 1）
        Cookie author = login(authorEmail);
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(author))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(author))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/posts/" + postId + "/reviews").cookie(author))
                .andExpect(jsonPath("$[0].thanksCount").value(1));
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/reviews")
                        .contentType("application/json").content(reviewBody()))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createReview(String email) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(login(email))
                        .contentType("application/json").content(reviewBody()))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private String reviewBody() {
        return "{\"good\":\"よい\",\"improvement\":\"改善案\","
                + "\"axisComments\":[{\"axis\":\"SECURITY\",\"comment\":\"認可OK\"}]}";
    }

    private long readId(MvcResult res) throws Exception {
        return JsonPath.parse(res.getResponse().getContentAsString())
                .read("$.id", Integer.class).longValue();
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
