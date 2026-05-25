package com.reviewboard.domain.passwordreset;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.domain.user.UserStatus;
import com.reviewboard.mail.MailService;
import com.reviewboard.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.OffsetDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B-4 パスワードリセット（#231）。S軸の拒否系（列挙防止・1度きり・期限切れ）を担保する。
 *
 * <p>生トークンはメールにのみ載るため、{@link MockitoSpyBean} で {@link MailService} を覗き、
 * 送信本文のリンクから raw token を取り出して confirm を検証する。
 */
class PasswordResetIntegrationTest extends AbstractIntegrationTest {

    @MockitoSpyBean
    MailService mailService;

    private static final String EMAIL = "reset@example.com";
    private Long cohortId;

    @BeforeEach
    void seed() {
        Cohort a = newCohort("A");
        cohortId = a.getId();
        newUser(EMAIL, UserRole.STUDENT, cohortId);
    }

    /** request 成功 → メール本文のリンクから raw token を取り出す。 */
    private String requestAndCaptureToken(String email) throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isNoContent());
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        // @Async なため timeout 付き verify（同期実行されても即マッチ）。
        verify(mailService, timeout(3000)).send(eq(email), any(), body.capture());
        Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(body.getValue());
        assertThat(m.find()).as("メール本文にリセットリンクが含まれる").isTrue();
        return m.group(1);
    }

    private void confirm(String token, String newPassword, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType("application/json")
                        .content("{\"token\":\"" + token + "\",\"password\":\"" + newPassword + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private void login(String email, String password, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    /** 発行 → 確定 → 新パスワードでログイン成功・旧パスワードは失敗（401）。 */
    @Test
    void full_flow_resets_password() throws Exception {
        String token = requestAndCaptureToken(EMAIL);
        String newPassword = "brand-new-passw0rd";

        confirm(token, newPassword, 204);

        login(EMAIL, newPassword, 200);
        login(EMAIL, PASSWORD, 401); // 旧パスワードはもう使えない
    }

    /** 同じトークンは 1 度きり：2 回目の confirm は 400。 */
    @Test
    void token_is_single_use() throws Exception {
        String token = requestAndCaptureToken(EMAIL);
        confirm(token, "first-new-passw0rd", 204);
        confirm(token, "second-new-passw0rd", 400);
    }

    /** 未知のトークンは 400（存在を区別しない）。 */
    @Test
    void unknown_token_is_rejected() throws Exception {
        confirm("totally-unknown-token", "whatever-passw0rd", 400);
    }

    /** 期限切れトークンは 400。 */
    @Test
    void expired_token_is_rejected() throws Exception {
        String token = requestAndCaptureToken(EMAIL);
        // DB 上の唯一のトークンを過去に失効させる。
        PasswordResetToken stored = passwordResetTokenRepository.findAll().get(0);
        stored.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        passwordResetTokenRepository.save(stored);

        confirm(token, "new-after-expiry-pw", 400);
    }

    /** 存在しない email でも 204（列挙防止）。メールは送らない。 */
    @Test
    void unknown_email_still_returns_204_and_sends_no_mail() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType("application/json")
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isNoContent());
        verify(mailService, never()).send(any(), any(), any());
    }

    /** 無効化（kick・#229）済みユーザーには発行しない（204 だが復活経路にしない）。 */
    @Test
    void disabled_user_gets_no_token() throws Exception {
        User u = userRepository.findByEmail(EMAIL).orElseThrow();
        u.setStatus(UserStatus.DISABLED);
        userRepository.save(u);

        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType("application/json")
                        .content("{\"email\":\"" + EMAIL + "\"}"))
                .andExpect(status().isNoContent());
        verify(mailService, never()).send(any(), any(), any());
        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
    }

    /** confirm の新パスワードが短すぎると 400（@Valid・min=8）。 */
    @Test
    void too_short_password_is_rejected() throws Exception {
        String token = requestAndCaptureToken(EMAIL);
        confirm(token, "short", 400);
    }
}
