package com.reviewboard.observability;

import com.reviewboard.domain.user.UserRole;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 観測性（母 §3-1）の検証。
 *
 * <ul>
 *   <li>運用メトリクス（metrics/prometheus）の公開範囲が運用ロール（講師）限定であること
 *       ＝誰でも JVM/Hikari/流量を覗けない（SEC-2/SEC-11）。</li>
 *   <li>health は監視プローブ用に未認証で開放されていること。</li>
 *   <li>相関 ID（X-Request-Id）が採番・引き継ぎ・レスポンス返却されること（{@link MdcLoggingFilter}）。</li>
 * </ul>
 */
// Spring Boot はテスト時にメトリクスエクスポート（prometheus 等）を既定で無効化する。
// 本テストは prometheus スクレイプを検証するため明示的に有効化する。
@AutoConfigureObservability(tracing = false)
class ObservabilityIntegrationTest extends AbstractIntegrationTest {

    private String studentEmail;
    private String teacherEmail;

    @BeforeEach
    void seed() {
        var cohort = newCohort("A");
        studentEmail = newUser("student@example.com", UserRole.STUDENT, cohort.getId()).getEmail();
        teacherEmail = newUser("teacher@example.com", UserRole.TEACHER, cohort.getId()).getEmail();
    }

    @Test
    void health_is_public_for_probes() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void prometheus_requires_authentication() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isUnauthorized());
    }

    /** ★受講生には運用メトリクスを見せない（情報漏えい防止）。 */
    @Test
    void student_cannot_read_metrics_returns403() throws Exception {
        mockMvc.perform(get("/actuator/prometheus").cookie(login(studentEmail)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/actuator/metrics").cookie(login(studentEmail)))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacher_can_scrape_golden_signals() throws Exception {
        mockMvc.perform(get("/actuator/prometheus").cookie(login(teacherEmail)))
                .andExpect(status().isOk())
                // Latency/Traffic/Errors（http.server.requests）と Saturation（jvm）が出ていること。
                .andExpect(content().string(containsString("http_server_requests")))
                .andExpect(content().string(containsString("jvm_memory_used_bytes")));
    }

    /** 相関 ID 未指定なら採番してレスポンスに返す。 */
    @Test
    void generates_request_id_when_absent() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(header().exists("X-Request-Id"));
    }

    /** 受信した相関 ID を引き継いでレスポンスに返す（LB/フロント由来の ID を維持）。 */
    @Test
    void propagates_incoming_request_id() throws Exception {
        mockMvc.perform(get("/actuator/health").header("X-Request-Id", "trace-abc-123"))
                .andExpect(header().string("X-Request-Id", is("trace-abc-123")));
    }
}
