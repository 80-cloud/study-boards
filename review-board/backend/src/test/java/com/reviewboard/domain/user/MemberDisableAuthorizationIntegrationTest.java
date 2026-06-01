package com.reviewboard.domain.user;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #229 メンバー無効化（kick）の認可テスト（★セキュリティ）。
 * cohort 境界・対象ロール・自己操作・無効化後のログイン遮断を網羅する。
 */
class MemberDisableAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private long studentAId;
    private long teacherAId;
    private long teacherA2Id;
    private long studentBId;
    private String teacherAEmail;
    private String studentAEmail;
    private String adminEmail;

    @BeforeEach
    void seed() {
        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        studentAEmail = newUser("sa@example.com", UserRole.STUDENT, a.getId()).getEmail();
        studentAId = userRepository.findByEmail(studentAEmail).orElseThrow().getId();
        teacherAEmail = newUser("ta@example.com", UserRole.TEACHER, a.getId()).getEmail();
        teacherAId = userRepository.findByEmail(teacherAEmail).orElseThrow().getId();
        teacherA2Id = newUser("ta2@example.com", UserRole.TEACHER, a.getId()).getId(); // 同 cohort の別講師
        studentBId = newUser("sb@example.com", UserRole.STUDENT, b.getId()).getId();
        adminEmail = newUser("admin@example.com", UserRole.ADMIN, a.getId()).getEmail();
    }

    /** 講師は自 cohort の受講生を無効化でき、その受講生はログイン不可（403）になる。 */
    @Test
    void teacher_disables_student_then_login_blocked() throws Exception {
        Cookie teacher = login(teacherAEmail);
        mockMvc.perform(put("/api/members/" + studentAId + "/disable").cookie(teacher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISABLED"));

        // 無効化後はログイン不可（403）
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"email\":\"" + studentAEmail + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isForbidden());

        // 再有効化でログイン可能に戻る
        mockMvc.perform(put("/api/members/" + studentAId + "/enable").cookie(login(teacherAEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"email\":\"" + studentAEmail + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());
    }

    /** ★cohort 境界：講師は他 cohort のユーザーを操作できない（404）。 */
    @Test
    void teacher_cannot_disable_other_cohort() throws Exception {
        mockMvc.perform(put("/api/members/" + studentBId + "/disable").cookie(login(teacherAEmail)))
                .andExpect(status().isNotFound());
    }

    /** 講師は同 cohort の別講師（非受講生）を無効化できない（403）。 */
    @Test
    void teacher_cannot_disable_non_student() throws Exception {
        mockMvc.perform(put("/api/members/" + teacherA2Id + "/disable").cookie(login(teacherAEmail)))
                .andExpect(status().isForbidden());
    }

    /** 自分自身は操作不可（400・自己操作チェックがロール/cohort 判定より先）。 */
    @Test
    void cannot_disable_self() throws Exception {
        // 講師が自分自身を → 400
        mockMvc.perform(put("/api/members/" + teacherAId + "/disable").cookie(login(teacherAEmail)))
                .andExpect(status().isBadRequest());
        // 管理者が自分自身を → 400
        long adminId = userRepository.findByEmail(adminEmail).orElseThrow().getId();
        mockMvc.perform(put("/api/members/" + adminId + "/disable").cookie(login(adminEmail)))
                .andExpect(status().isBadRequest());
    }

    /** 受講生は API を呼べない（403）。 */
    @Test
    void student_cannot_access_member_api() throws Exception {
        Cookie student = login(studentAEmail);
        mockMvc.perform(get("/api/members").cookie(student)).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/members/" + teacherAId + "/disable").cookie(student))
                .andExpect(status().isForbidden());
    }

    /** 管理者は管理者を無効化できない（403）。 */
    @Test
    void admin_cannot_disable_admin() throws Exception {
        // 別の管理者を用意
        long otherAdminId = newUser("admin2@example.com", UserRole.ADMIN,
                userRepository.findByEmail(adminEmail).orElseThrow().getCohortId()).getId();
        mockMvc.perform(put("/api/members/" + otherAdminId + "/disable").cookie(login(adminEmail)))
                .andExpect(status().isForbidden());
    }

    /** 未認証は 401。 */
    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(get("/api/members")).andExpect(status().isUnauthorized());
    }
}
