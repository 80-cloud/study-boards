package com.reviewboard.domain.invite;

import com.jayway.jsonpath.JsonPath;
import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 招待フロー（Issue #165）の認可・登録検証。★セキュリティ：発行/失効は自 cohort 限定、
 * 受講生は発行 403、別 cohort の招待失効は 404、登録は招待消費・cohort 紐付け・重複/無効を拒否。
 */
class InviteFlowIntegrationTest extends AbstractIntegrationTest {

    private String issueCode(Cookie teacher, String bodyJson) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/invites").cookie(teacher)
                        .contentType("application/json").content(bodyJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn();
        return JsonPath.parse(res.getResponse().getContentAsString()).read("$.rawCode");
    }

    @Test
    void teacher_issues_and_student_registers_into_that_cohort() throws Exception {
        Cohort a = newCohort("A");
        newUser("teacher-a@test", UserRole.TEACHER, a.getId());
        Cookie teacher = login("teacher-a@test");

        String code = issueCode(teacher, "{}");

        // 受講生が招待コードで登録 → 201・STUDENT・cohort A・Cookie 発行
        MvcResult reg = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content("{\"code\":\"" + code + "\",\"email\":\"newbie@test\","
                                + "\"displayName\":\"新人\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andReturn();
        assertThat(reg.getResponse().getCookie("access_token")).isNotNull();

        User created = userRepository.findByEmail("newbie@test").orElseThrow();
        assertThat(created.getCohortId()).isEqualTo(a.getId());
        assertThat(created.getRole()).isEqualTo(UserRole.STUDENT);
    }

    @Test
    void student_cannot_issue_invite_403() throws Exception {
        Cohort a = newCohort("A");
        newUser("student-a@test", UserRole.STUDENT, a.getId());
        Cookie student = login("student-a@test");

        mockMvc.perform(post("/api/invites").cookie(student)
                        .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_cannot_list_invites_401() throws Exception {
        mockMvc.perform(get("/api/invites")).andExpect(status().isUnauthorized());
    }

    @Test
    void teacher_cannot_revoke_other_cohort_invite_404() throws Exception {
        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        newUser("teacher-a@test", UserRole.TEACHER, a.getId());
        newUser("teacher-b@test", UserRole.TEACHER, b.getId());
        Cookie teacherA = login("teacher-a@test");
        Cookie teacherB = login("teacher-b@test");

        issueCode(teacherA, "{}");
        // A の招待 id を A 自身の一覧から取得
        MvcResult list = mockMvc.perform(get("/api/invites").cookie(teacherA))
                .andExpect(status().isOk()).andReturn();
        int inviteId = JsonPath.parse(list.getResponse().getContentAsString()).read("$[0].id");

        // 別 cohort の講師は存在を漏らさず 404
        mockMvc.perform(delete("/api/invites/" + inviteId).cookie(teacherB))
                .andExpect(status().isNotFound());
    }

    @Test
    void revoked_invite_cannot_be_used_400() throws Exception {
        Cohort a = newCohort("A");
        newUser("teacher-a@test", UserRole.TEACHER, a.getId());
        Cookie teacher = login("teacher-a@test");

        String code = issueCode(teacher, "{}");
        MvcResult list = mockMvc.perform(get("/api/invites").cookie(teacher))
                .andExpect(status().isOk()).andReturn();
        int inviteId = JsonPath.parse(list.getResponse().getContentAsString()).read("$[0].id");

        mockMvc.perform(delete("/api/invites/" + inviteId).cookie(teacher))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"code\":\"" + code + "\",\"email\":\"x@test\","
                                + "\"displayName\":\"x\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalid_code_is_rejected_400() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"code\":\"not-a-real-code\",\"email\":\"x@test\","
                                + "\"displayName\":\"x\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void code_cannot_exceed_max_uses_400() throws Exception {
        Cohort a = newCohort("A");
        newUser("teacher-a@test", UserRole.TEACHER, a.getId());
        Cookie teacher = login("teacher-a@test");

        String code = issueCode(teacher, "{\"maxUses\":1}");

        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"code\":\"" + code + "\",\"email\":\"first@test\","
                                + "\"displayName\":\"一人目\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isCreated());

        // 2 人目は maxUses=1 を超えるため 400
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"code\":\"" + code + "\",\"email\":\"second@test\","
                                + "\"displayName\":\"二人目\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicate_email_is_rejected_400() throws Exception {
        Cohort a = newCohort("A");
        newUser("teacher-a@test", UserRole.TEACHER, a.getId());
        newUser("taken@test", UserRole.STUDENT, a.getId());
        Cookie teacher = login("teacher-a@test");

        String code = issueCode(teacher, "{}");
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"code\":\"" + code + "\",\"email\":\"taken@test\","
                                + "\"displayName\":\"重複\",\"password\":\"register-pass-1\"}"))
                .andExpect(status().isBadRequest());
    }
}
