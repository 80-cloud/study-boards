package com.reviewboard.support;

import com.reviewboard.domain.audit.AuditLogRepository;
import com.reviewboard.domain.auth.AuthCookies;
import com.reviewboard.domain.auth.RefreshTokenRepository;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.evaluation.EvaluationRepository;
import com.reviewboard.domain.notification.NotificationRepository;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.ReviewAxisCommentRepository;
import com.reviewboard.domain.review.ReviewReplyRepository;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.review.ThanksRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 統合テストの共通基盤。Testcontainers の PostgreSQL・テスト間の FK 依存順クリーンアップ・
 * ログイン/ユーザー作成のヘルパーを集約する。
 *
 * <p>各ドメインで散在していた {@code deleteAll()} の順序ミス（refresh_tokens / audit_logs などの
 * 子テーブルを親 users より先に消さず FK 違反）を一箇所に集約し、再発（過去3回）を断つ。
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    /**
     * singleton container パターン：{@code @Container}（クラスごとに start/stop）ではなく、
     * static 初期化で一度だけ起動し JVM 終了まで止めない。全テストクラスで1つの DB を共有し、
     * クラス間でコンテナが停止されて "Could not open JPA EntityManager" になるのを防ぐ。
     * 後始末は Testcontainers の Ryuk（JVM 終了時）に委ねる。
     */
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    /**
     * SEC-8 アップロードを本番同等で検証するための MinIO（S3 互換）。Postgres と同じく singleton で
     * 一度だけ起動し JVM 終了まで止めない（全テストクラスで Spring コンテキストを共有・再起動コストを避ける）。
     */
    static final MinIOContainer MINIO = new MinIOContainer("minio/minio:latest");

    static {
        POSTGRES.start();
        MINIO.start();
    }

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.jwt.secret", () -> "test-secret-please-change-32chars-minimum");
        registry.add("app.storage.s3.endpoint", MINIO::getS3URL);
        registry.add("app.storage.s3.access-key", MINIO::getUserName);
        registry.add("app.storage.s3.secret-key", MINIO::getPassword);
    }

    protected static final String PASSWORD = "correct-horse-battery";

    @Autowired protected MockMvc mockMvc;
    @Autowired protected CohortRepository cohortRepository;
    @Autowired protected UserRepository userRepository;
    @Autowired protected PostRepository postRepository;
    @Autowired protected ReviewRepository reviewRepository;
    @Autowired protected ReviewAxisCommentRepository axisCommentRepository;
    @Autowired protected ThanksRepository thanksRepository;
    @Autowired protected ReviewReplyRepository replyRepository;
    @Autowired protected EvaluationRepository evaluationRepository;
    @Autowired protected NotificationRepository notificationRepository;
    @Autowired protected AuditLogRepository auditLogRepository;
    @Autowired protected RefreshTokenRepository refreshTokenRepository;
    @Autowired protected com.reviewboard.domain.passwordreset.PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired protected com.reviewboard.domain.notificationpref.UserNotificationPrefRepository notificationPrefRepository;
    @Autowired protected com.reviewboard.domain.invite.CohortInviteRepository inviteRepository;
    @Autowired protected org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Autowired protected com.reviewboard.domain.auth.RateLimitFilter rateLimitFilter;

    /** FK 依存順（子 → 親）に全テーブルを掃除する。サブクラスで追加掃除が要れば override 可。 */
    @BeforeEach
    void cleanDatabase() {
        rateLimitFilter.clear(); // SEC-12 レートリミットの窓をテスト間で持ち越さない
        auditLogRepository.deleteAll();
        notificationRepository.deleteAll();
        replyRepository.deleteAll();
        thanksRepository.deleteAll();
        axisCommentRepository.deleteAll();
        evaluationRepository.deleteAll();
        reviewRepository.deleteAll();
        postRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        notificationPrefRepository.deleteAll();
        inviteRepository.deleteAll();
        userRepository.deleteAll();
        cohortRepository.deleteAll();
    }

    // ---- 共通ヘルパー ----

    protected Cohort newCohort(String name) {
        Cohort c = new Cohort();
        c.setName(name);
        c.setCreatedAt(OffsetDateTime.now());
        return cohortRepository.save(c);
    }

    protected User newUser(String email, UserRole role, Long cohortId) {
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

    /** メール+パスワードでログインし、access Cookie を返す。 */
    protected Cookie login(String email) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie access = res.getResponse().getCookie(AuthCookies.ACCESS);
        assertThat(access).isNotNull();
        return access;
    }

    /** レスポンス body の $.id を long で取り出す。 */
    protected long readId(MvcResult res) throws Exception {
        return JsonPath.parse(res.getResponse().getContentAsString()).read("$.id", Integer.class).longValue();
    }
}
