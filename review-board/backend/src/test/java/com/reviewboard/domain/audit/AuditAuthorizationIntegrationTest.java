package com.reviewboard.domain.audit;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * S軸 監査ログの認可・記録テスト（要件 §4-1）。
 * 操作が監査行として残ること、閲覧が講師限定・自 cohort のみであることを検証する。
 */
class AuditAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;
    private String teacherEmail;
    private String teacherBEmail;

    @BeforeEach
    void seed() throws Exception {
        var a = newCohort("A");
        var b = newCohort("B");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, a.getId()).getEmail();
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId()).getEmail();
        teacherBEmail = newUser("teacherB@example.com", UserRole.TEACHER, b.getId()).getEmail();

        // cohort A で活動：投稿作成 → 講師承認（監査行が2件残るはず）
        long postId = createPost(login(authorEmail), "作品");
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(teacherEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"合格\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void actions_are_recorded_and_visible_to_teacher() throws Exception {
        mockMvc.perform(get("/api/audit-logs").cookie(login(teacherEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[?(@.action == 'POST_CREATED')]").exists())
                .andExpect(jsonPath("$.content[?(@.action == 'EVALUATION_APPROVED')]").exists());
    }

    /** ★監査情報は機微：受講生は閲覧できない（403）。 */
    @Test
    void student_cannot_view_audit_logs_returns403() throws Exception {
        mockMvc.perform(get("/api/audit-logs").cookie(login(authorEmail)))
                .andExpect(status().isForbidden());
    }

    /** cohort 分離：他 cohort の講師には cohort A のログが見えない。 */
    @Test
    void teacher_sees_only_own_cohort_logs() throws Exception {
        mockMvc.perform(get("/api/audit-logs").cookie(login(teacherBEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
        assertThat(auditLogRepository.count()).isEqualTo(2);
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(get("/api/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
