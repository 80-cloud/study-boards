package com.reviewboard.domain.notificationpref;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * C-5 通知設定 API（#233）。既定（全 ON）・更新の往復・本人限定（独立性）・未認証 401 を検証する。
 */
class NotificationPrefIntegrationTest extends AbstractIntegrationTest {

    @BeforeEach
    void seed() {
        Cohort a = newCohort("A");
        newUser("alice@example.com", UserRole.STUDENT, a.getId());
        newUser("bob@example.com", UserRole.STUDENT, a.getId());
    }

    /** 行が無いユーザーは既定で全 ON を返す。 */
    @Test
    void defaults_when_no_row() throws Exception {
        Cookie c = login("alice@example.com");
        mockMvc.perform(get("/api/notification-prefs").cookie(c))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(true))
                .andExpect(jsonPath("$.weeklyDigest").value(true));
    }

    /** 更新→取得で反映される。 */
    @Test
    void update_then_get_reflects() throws Exception {
        Cookie c = login("alice@example.com");
        mockMvc.perform(put("/api/notification-prefs").cookie(c)
                        .contentType("application/json")
                        .content("{\"emailEnabled\":false,\"weeklyDigest\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(false))
                .andExpect(jsonPath("$.weeklyDigest").value(true));

        mockMvc.perform(get("/api/notification-prefs").cookie(c))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(false));
    }

    /** alice の更新は bob に影響しない（本人限定・設定は独立）。 */
    @Test
    void prefs_are_per_user() throws Exception {
        Cookie alice = login("alice@example.com");
        mockMvc.perform(put("/api/notification-prefs").cookie(alice)
                        .contentType("application/json")
                        .content("{\"emailEnabled\":false,\"weeklyDigest\":false}"))
                .andExpect(status().isOk());

        Cookie bob = login("bob@example.com");
        mockMvc.perform(get("/api/notification-prefs").cookie(bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(true))
                .andExpect(jsonPath("$.weeklyDigest").value(true));
    }

    /** 未認証は 401。 */
    @Test
    void unauthenticated_is_401() throws Exception {
        mockMvc.perform(get("/api/notification-prefs")).andExpect(status().isUnauthorized());
    }

    /** null フィールドは 400（@NotNull）。 */
    @Test
    void null_fields_rejected() throws Exception {
        Cookie c = login("alice@example.com");
        mockMvc.perform(put("/api/notification-prefs").cookie(c)
                        .contentType("application/json")
                        .content("{\"emailEnabled\":true}"))
                .andExpect(status().isBadRequest());
    }
}
