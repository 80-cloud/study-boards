package com.reviewboard.domain.audit;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 監査ログのハッシュ連鎖（#247）。連鎖が valid に組まれること、途中行の改ざんを検知すること、
 * 検証エンドポイントが講師限定・自 cohort であることを検証する。
 */
class AuditHashChainIntegrationTest extends AbstractIntegrationTest {

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

        // cohort A で活動（監査行が複数残る）：投稿2件＋承認1件。
        long p1 = createPost(login(authorEmail), "作品1");
        createPost(login(authorEmail), "作品2");
        mockMvc.perform(post("/api/posts/" + p1 + "/evaluation").cookie(login(teacherEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"合格\"}"))
                .andExpect(status().isOk());
    }

    /** 連鎖は valid に組まれ、検証は対象行数を返す。 */
    @Test
    void chain_is_valid_after_recorded_actions() throws Exception {
        mockMvc.perform(get("/api/audit-logs/verify").cookie(login(teacherEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.count").value(3))
                .andExpect(jsonPath("$.firstBrokenId").doesNotExist());
    }

    /** 途中行の内容を書き換えると、その行で連鎖の破れを検知する。 */
    @Test
    void tampering_a_row_is_detected() throws Exception {
        // cohort A の連鎖の2番目の行を書き換える（entry_hash は据え置き＝再計算で不一致になる）。
        List<AuditLog> chain = auditLogRepository.findByCohortIdAndEntryHashIsNotNullOrderByIdAsc(
                userRepository.findByEmail(teacherEmail).orElseThrow().getCohortId());
        AuditLog victim = chain.get(1);
        victim.setTargetId(victim.getTargetId() + 999_999); // 改ざん
        auditLogRepository.save(victim);

        mockMvc.perform(get("/api/audit-logs/verify").cookie(login(teacherEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.firstBrokenId").value(victim.getId()));
    }

    /** 検証は講師限定（受講生は 403）。 */
    @Test
    void student_cannot_verify_returns403() throws Exception {
        mockMvc.perform(get("/api/audit-logs/verify").cookie(login(authorEmail)))
                .andExpect(status().isForbidden());
    }

    /** 検証は未認証で 401。 */
    @Test
    void unauthenticated_verify_is_401() throws Exception {
        mockMvc.perform(get("/api/audit-logs/verify"))
                .andExpect(status().isUnauthorized());
    }

    /** cohort 分離：他 cohort の講師は自 cohort（空の連鎖）を検証＝valid・count 0。 */
    @Test
    void other_cohort_teacher_verifies_own_empty_chain() throws Exception {
        mockMvc.perform(get("/api/audit-logs/verify").cookie(login(teacherBEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.count").value(0));
    }

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }
}
