package com.reviewboard.domain.profile;

import com.reviewboard.domain.auth.AuthCookies;
import com.reviewboard.domain.auth.RefreshTokenRepository;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.evaluation.EvaluationRepository;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.ReviewAxisCommentRepository;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.review.ThanksRepository;
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
 * F-PROF 成長記録ページの認可・集約テスト（★S軸・テスト計画書 §6）。
 * 投稿履歴/もらったレビュー(講師強調)/合格バッジ/したレビュー実績の集約と、
 * cohort 境界（他 cohort は 404）・未認証を検証する。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProfileAuthorizationIntegrationTest {

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
    @Autowired EvaluationRepository evaluationRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private static final String PW = "correct-horse-battery";

    private long authorId;
    private long reviewerId;
    private String authorEmail;
    private String reviewerEmail;
    private String teacherEmail;
    private String bEmail;

    @BeforeEach
    void setUp() throws Exception {
        thanksRepository.deleteAll();
        axisCommentRepository.deleteAll();
        evaluationRepository.deleteAll();
        reviewRepository.deleteAll();
        postRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();

        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        User author = newUser("author@example.com", UserRole.STUDENT, a.getId());
        User reviewer = newUser("reviewer@example.com", UserRole.STUDENT, a.getId());
        authorId = author.getId();
        reviewerId = reviewer.getId();
        authorEmail = author.getEmail();
        reviewerEmail = reviewer.getEmail();
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId()).getEmail();
        bEmail = newUser("b@example.com", UserRole.STUDENT, b.getId()).getEmail();

        // author が投稿2件。post1 をレビュー(受講生+講師)・ありがとう・講師承認する
        Cookie authorCookie = login(authorEmail);
        long post1 = createPost(authorCookie, "作品1");
        createPost(authorCookie, "作品2");

        long studentReview = createReview(login(reviewerEmail), post1);
        createReview(login(teacherEmail), post1);                 // 講師レビュー
        thank(authorCookie, studentReview);                       // author が reviewer に感謝
        evaluate(login(teacherEmail), post1, "APPROVED", "合格");  // 合格バッジ
    }

    @Test
    void author_profile_aggregates_posts_received_reviews_and_badge() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(2))
                // 新しい順：作品2 が先頭、作品1 は合格バッジ付き
                .andExpect(jsonPath("$.posts[?(@.title == '作品1')].approved").value(true))
                // もらったレビューは2件（受講生＋講師）、講師レビューが強調対象
                .andExpect(jsonPath("$.receivedReviews.length()").value(2))
                .andExpect(jsonPath("$.receivedReviews[?(@.teacherReview == true)].reviewerRole").value("TEACHER"))
                // F-PROF-03 もらったレビュー数（author 視点）
                .andExpect(jsonPath("$.stats.receivedReviewsCount").value(2));
    }

    @Test
    void reviewer_profile_shows_given_stats_and_thanks() throws Exception {
        mockMvc.perform(get("/api/users/" + reviewerId + "/profile").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.givenReviewsCount").value(1))
                .andExpect(jsonPath("$.stats.thanksReceivedCount").value(1))
                .andExpect(jsonPath("$.posts.length()").value(0));
    }

    @Test
    void same_cohort_member_can_view_others_profile() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(reviewerEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value((int) authorId));
    }

    @Test
    void other_cohort_cannot_view_profile_returns404() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile").cookie(login(bEmail)))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(get("/api/users/" + authorId + "/profile"))
                .andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private long createReview(Cookie cookie, long postId) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts/" + postId + "/reviews").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"good\":\"よい\",\"improvement\":\"改善\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    private void thank(Cookie cookie, long reviewId) throws Exception {
        mockMvc.perform(post("/api/reviews/" + reviewId + "/thanks").cookie(cookie))
                .andExpect(status().isNoContent());
    }

    private void evaluate(Cookie cookie, long postId, String result, String comment) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"result\":\"" + result + "\",\"comment\":\"" + comment + "\"}"))
                .andExpect(status().isOk());
    }

    private long readId(MvcResult res) throws Exception {
        return JsonPath.parse(res.getResponse().getContentAsString()).read("$.id", Integer.class).longValue();
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

    private User newUser(String email, UserRole role, Long cohortId) {
        OffsetDateTime now = OffsetDateTime.now();
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(PW));
        u.setDisplayName(email);
        u.setRole(role);
        u.setCohortId(cohortId);
        u.setCreatedAt(now);
        u.setUpdatedAt(now);
        return userRepository.save(u);
    }
}
