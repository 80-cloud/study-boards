package com.reviewboard.domain.me;

import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditService;
import com.reviewboard.domain.audit.AuditTargetType;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.auth.RefreshTokenRepository;
import com.reviewboard.domain.mfa.RecoveryCodeService;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 自分のアカウントの退会（#263）。論理削除＋匿名化方式。
 *
 * <p>投稿・レビュー・ありがとうは他メンバーの記録に絡むため物理削除せず、作者を「退会したユーザー」
 * として匿名化したうえで残す。個人を識別する情報（email・表示名・アバター・bio・TOTP）は消し、
 * 以後ログインできない（status=DELETED）。監査ログはコミュニティの説明責任のため保持し、
 * 退会操作自体を USER_DELETED として記録する。
 */
@Service
public class AccountService {

    private static final String ANON_DISPLAY_NAME = "退会したユーザー";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RecoveryCodeService recoveryCodeService;
    private final AuditService auditService;

    public AccountService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                          RecoveryCodeService recoveryCodeService, AuditService auditService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.recoveryCodeService = recoveryCodeService;
        this.auditService = auditService;
    }

    /** 本人の退会。冪等性は要求しない（認証済みの本人のみが1回呼ぶ）。 */
    @Transactional
    public void deleteSelf(AuthPrincipal principal) {
        Long userId = principal.userId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        OffsetDateTime now = OffsetDateTime.now();

        // 個人を識別する情報の匿名化。email は一意制約があるため一意なダミーに置換する。
        user.setEmail("deleted-" + userId + "@deleted.invalid");
        user.setDisplayName(ANON_DISPLAY_NAME);
        user.setBio(null);
        user.setAvatarKey(null);
        user.setTotpSecret(null);
        user.setMfaEnabled(false);
        user.setStatus(UserStatus.DELETED);
        user.setUpdatedAt(now);

        // セッション・第2要素の残骸を破棄（再ログインを完全に塞ぐ）。
        refreshTokenRepository.revokeAllActiveByUserId(userId, now);
        recoveryCodeService.deleteAll(userId);

        // 監査は保持（説明責任）。退会操作自体を記録する。
        auditService.record(principal, AuditAction.USER_DELETED, AuditTargetType.USER, userId);
    }
}
