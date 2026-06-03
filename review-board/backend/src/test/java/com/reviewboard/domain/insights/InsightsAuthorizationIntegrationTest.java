package com.reviewboard.domain.insights;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * エンゲージメント計測 API の認可（#273・★セキュリティ）。
 * 運営限定（講師/管理者）・自 cohort のみ・受講生403・未認証401・他 cohort 越境不可を検証する。
 */
class InsightsAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private String studentEmail;
    private String teacherAEmail;
    private String teacherBEmail;
    private String adminEmail;

    @BeforeEach
    void seed() {
        var a = newCohort("A");
        var b = newCohort("B");
        User student = newUser("student@example.com", UserRole.STUDENT, a.getId());
        studentEmail = student.getEmail();
        teacherAEmail = newUser("teacherA@example.com", UserRole.TEACHER, a.getId()).getEmail();
        teacherBEmail = newUser("teacherB@example.com", UserRole.TEACHER, b.getId()).getEmail();
        adminEmail = newUser("admin@example.com", UserRole.ADMIN, a.getId()).getEmail();

        // cohort A にのみ投稿を1件置く（他 cohort 越境テスト用）。
        Post p = new Post();
        p.setAuthorUserId(student.getId());
        p.setCohortId(a.getId());
        p.setTitle("作品");
        p.setDescription("説明");
        p.setReviewCount(0);
        p.setCreatedAt(OffsetDateTime.now());
        p.setUpdatedAt(OffsetDateTime.now());
        postRepository.save(p);
    }

    @Test
    void teacher_can_view_own_cohort_metrics() throws Exception {
        mockMvc.perform(get("/api/insights/engagement").cookie(login(teacherAEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.total").value(1));
    }

    @Test
    void admin_can_view_metrics() throws Exception {
        mockMvc.perform(get("/api/insights/engagement").cookie(login(adminEmail)))
                .andExpect(status().isOk());
    }

    @Test
    void student_is_forbidden_returns403() throws Exception {
        mockMvc.perform(get("/api/insights/engagement").cookie(login(studentEmail)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_is_rejected_returns401() throws Exception {
        mockMvc.perform(get("/api/insights/engagement"))
                .andExpect(status().isUnauthorized());
    }

    /** cohort 分離：他 cohort の講師には A の投稿が見えない（自 cohort の数値のみ＝0）。 */
    @Test
    void teacher_sees_only_own_cohort_not_other() throws Exception {
        mockMvc.perform(get("/api/insights/engagement").cookie(login(teacherBEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.total").value(0));
    }
}
