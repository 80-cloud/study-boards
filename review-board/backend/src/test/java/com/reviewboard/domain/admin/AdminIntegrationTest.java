package com.reviewboard.domain.admin;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 運用管理 API（ADMIN 限定）の認可・整合性テスト（★S軸）。
 * 受講生/講師が /api/admin/** を呼べないこと（権限昇格防止）を必ず確認する。
 */
class AdminIntegrationTest extends AbstractIntegrationTest {

    private Long cohortId;

    @BeforeEach
    void seed() {
        Cohort cohort = newCohort("admin cohort");
        cohortId = cohort.getId();
        newUser("admin@example.com", UserRole.ADMIN, cohortId);
        newUser("teacher@example.com", UserRole.TEACHER, cohortId);
        newUser("student@example.com", UserRole.STUDENT, cohortId);
    }

    private String userJson(String email, String role, Long cohort, String password) {
        return "{\"email\":\"" + email + "\",\"displayName\":\"新規ユーザー\",\"role\":\"" + role
                + "\",\"cohortId\":" + cohort + ",\"password\":\"" + password + "\"}";
    }

    @Test
    void admin_createsCohortAndUser_andIssuedUserCanLogin() throws Exception {
        Cookie admin = login("admin@example.com");

        // cohort 作成
        MvcResult cohortRes = mockMvc.perform(post("/api/admin/cohorts").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"2026 期 B\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("2026 期 B"))
                .andReturn();
        Long newCohortId = com.jayway.jsonpath.JsonPath.parse(
                cohortRes.getResponse().getContentAsString()).read("$.id", Long.class);

        // アカウント発行
        mockMvc.perform(post("/api/admin/users").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("new.student@example.com", "STUDENT", newCohortId, "newpass12345")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new.student@example.com"))
                .andExpect(jsonPath("$.role").value("STUDENT"));

        // 発行されたユーザーでログインできる
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new.student@example.com\",\"password\":\"newpass12345\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void student_cannotAccessAdmin_403() throws Exception {
        Cookie student = login("student@example.com");
        mockMvc.perform(post("/api/admin/cohorts").cookie(student)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacher_cannotAccessAdmin_403() throws Exception {
        Cookie teacher = login("teacher@example.com");
        mockMvc.perform(post("/api/admin/users").cookie(teacher)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("x@example.com", "STUDENT", cohortId, "password12345")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_cannotAccessAdmin_401() throws Exception {
        mockMvc.perform(get("/api/admin/cohorts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmail_returns400() throws Exception {
        Cookie admin = login("admin@example.com");
        mockMvc.perform(post("/api/admin/users").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("student@example.com", "STUDENT", cohortId, "password12345")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonexistentCohort_returns404() throws Exception {
        Cookie admin = login("admin@example.com");
        mockMvc.perform(post("/api/admin/users").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("x@example.com", "STUDENT", 99999999L, "password12345")))
                .andExpect(status().isNotFound());
    }
}
