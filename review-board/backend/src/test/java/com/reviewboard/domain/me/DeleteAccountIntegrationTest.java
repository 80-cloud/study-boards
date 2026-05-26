package com.reviewboard.domain.me;

import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.mfa.MfaRecoveryCode;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.domain.user.UserStatus;
import com.reviewboard.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * アカウント削除（退会・#263・論理削除＋匿名化）。匿名化・ログイン遮断・投稿の残存・
 * リカバリコード/監査・未認証拒否を検証する。
 */
class DeleteAccountIntegrationTest extends AbstractIntegrationTest {

    private String email;
    private Long userId;

    @BeforeEach
    void seed() throws Exception {
        var a = newCohort("A");
        User u = newUser("quit@example.com", UserRole.STUDENT, a.getId());
        email = u.getEmail();
        userId = u.getId();
    }

    private long createPost(Cookie cookie, String title) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/posts").cookie(cookie)
                        .contentType("application/json")
                        .content("{\"title\":\"" + title + "\",\"description\":\"説明\"}"))
                .andExpect(status().isCreated()).andReturn();
        return readId(res);
    }

    /** 退会で論理削除＋匿名化。投稿は残り、PII は消え、再ログインできない。 */
    @Test
    void delete_self_anonymizes_and_blocks_login() throws Exception {
        Cookie access = login(email);
        long postId = createPost(access, "私の作品");

        // 退会前にリカバリコードを1件仕込む（削除されることの確認用）。
        MfaRecoveryCode rc = new MfaRecoveryCode();
        rc.setUserId(userId);
        rc.setCodeHash("a".repeat(64));
        rc.setCreatedAt(OffsetDateTime.now());
        mfaRecoveryCodeRepository.save(rc);

        mockMvc.perform(delete("/api/me").cookie(access)).andExpect(status().isNoContent());

        // 匿名化・状態。
        User after = userRepository.findById(userId).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(after.getDisplayName()).isEqualTo("退会したユーザー");
        assertThat(after.getEmail()).isNotEqualTo(email).contains("deleted-");
        assertThat(after.getBio()).isNull();
        assertThat(after.getAvatarKey()).isNull();
        assertThat(after.getTotpSecret()).isNull();
        assertThat(after.isMfaEnabled()).isFalse();

        // 投稿は残る（コミュニティ記録の整合）。
        assertThat(postRepository.findById(postId)).isPresent();
        // リカバリコードは削除される。
        assertThat(mfaRecoveryCodeRepository.count()).isZero();
        // 監査に USER_DELETED が残る。
        assertThat(auditLogRepository.findAll())
                .anyMatch(l -> l.getAction() == AuditAction.USER_DELETED && l.getTargetId().equals(userId));

        // 元のメールでは再ログインできない（匿名化済み＝未知ユーザー扱いで 401）。
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    /** 未認証の退会は 401。 */
    @Test
    void unauthenticated_delete_is_401() throws Exception {
        mockMvc.perform(delete("/api/me")).andExpect(status().isUnauthorized());
    }
}
