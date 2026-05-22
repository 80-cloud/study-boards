package com.reviewboard.domain.evaluation;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * F-EVAL の認可テスト（★S軸の重点＝権限昇格防止）。
 * 受講生が講師限定の評価操作を呼べないこと（403）を中心に、cohort 境界・最新後勝ち＋履歴を検証する。
 */
class EvaluationAuthorizationIntegrationTest extends AbstractIntegrationTest {

    private String authorEmail;    // cohort A・受講生・投稿者
    private String teacherEmail;   // cohort A・講師
    private String teacherBEmail;  // cohort B・講師
    private long postId;

    @BeforeEach
    void seed() throws Exception {
        Cohort a = newCohort("A");
        Cohort b = newCohort("B");
        authorEmail = newUser("author@example.com", UserRole.STUDENT, a.getId()).getEmail();
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, a.getId()).getEmail();
        teacherBEmail = newUser("teacherB@example.com", UserRole.TEACHER, b.getId()).getEmail();

        MvcResult res = mockMvc.perform(post("/api/posts").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"title\":\"作品\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        postId = JsonPath.parse(res.getResponse().getContentAsString()).read("$.id", Integer.class);
    }

    @Test
    void teacher_can_evaluate_and_fetch_latest() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(teacherEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"合格です\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(true));

        mockMvc.perform(get("/api/posts/" + postId + "/evaluation").cookie(login(authorEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("APPROVED"));
    }

    /** ★最重要：受講生は講師限定の評価操作を呼べない（権限昇格防止）。 */
    @Test
    void student_cannot_evaluate_returns403() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(authorEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"自己承認の試み\"}"))
                .andExpect(status().isForbidden());

        assertThat(evaluationRepository.findByPostIdOrderByCreatedAtDesc(postId)).isEmpty();
    }

    @Test
    void new_evaluation_supersedes_and_keeps_history() throws Exception {
        Cookie teacher = login(teacherEmail);
        evaluate(teacher, "RETURNED", "差し戻し");
        evaluate(teacher, "APPROVED", "再提出を承認");

        mockMvc.perform(get("/api/posts/" + postId + "/evaluation").cookie(teacher))
                .andExpect(jsonPath("$.result").value("APPROVED"));
        assertThat(evaluationRepository.findByPostIdOrderByCreatedAtDesc(postId)).hasSize(2);
        assertThat(evaluationRepository.findByPostIdAndLatestIsTrue(postId)).isPresent();
    }

    @Test
    void teacher_of_other_cohort_cannot_evaluate_returns404() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(login(teacherBEmail))
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"他cohortから\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_is_rejected() throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation")
                        .contentType("application/json")
                        .content("{\"result\":\"APPROVED\",\"comment\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    private void evaluate(Cookie teacher, String result, String comment) throws Exception {
        mockMvc.perform(post("/api/posts/" + postId + "/evaluation").cookie(teacher)
                        .contentType("application/json")
                        .content("{\"result\":\"" + result + "\",\"comment\":\"" + comment + "\"}"))
                .andExpect(status().isOk());
    }
}
