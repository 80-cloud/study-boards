package com.reviewboard.domain.auth;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.invite.InviteService;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 認証フローのオーケストレーション（F-AUTH）。
 * トークンの生成・rotation は専用サービスに委譲し、ここは「誰を認証したか」を担う。
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final InviteService inviteService;
    private final com.reviewboard.domain.mfa.TotpService totpService;
    private final com.reviewboard.domain.mfa.RecoveryCodeService recoveryCodeService;
    private final com.reviewboard.domain.mfa.SecretCipher secretCipher;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, RefreshTokenService refreshTokenService,
                       InviteService inviteService, com.reviewboard.domain.mfa.TotpService totpService,
                       com.reviewboard.domain.mfa.RecoveryCodeService recoveryCodeService,
                       com.reviewboard.domain.mfa.SecretCipher secretCipher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.inviteService = inviteService;
        this.totpService = totpService;
        this.recoveryCodeService = recoveryCodeService;
        this.secretCipher = secretCipher;
    }

    /**
     * F-AUTH-02 招待コードによる受講生の自己登録（Issue #165・公開）。
     * 招待を原子的に消費して登録先 cohort を決め、role は常に STUDENT で作成、そのままログイン状態にする。
     * email 重複は 400。無効な招待は InviteService が 400（条件は漏らさない）。
     */
    @Transactional
    public LoginResult register(String rawCode, String email, String displayName, String rawPassword) {
        Long cohortId = inviteService.validateAndConsume(rawCode);
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new InvalidRequestException("この email は既に使われています");
        }
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setDisplayName(displayName.trim());
        user.setRole(UserRole.STUDENT);
        user.setCohortId(cohortId);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        return issueSession(user);
    }

    /**
     * F-AUTH-01 ログイン。失敗は存在を漏らさない汎用エラー（BadCredentials）。
     * MFA（#235）有効ユーザーはここでは access/refresh を出さず、TOTP 待ちの「チャレンジ」を返す。
     */
    @Transactional
    public LoginResult login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElseThrow(BadCredentialsException::new);
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new BadCredentialsException();
        }
        // #229 無効化（kick）・#263 退会（DELETED）はログイン不可（403）。ACTIVE 以外は遮断。
        if (user.getStatus() != com.reviewboard.domain.user.UserStatus.ACTIVE) {
            throw new org.springframework.security.access.AccessDeniedException("このアカウントは利用できません");
        }
        // #235 MFA 有効：パスワードは正しいが、まだログインさせない。TOTP 確認のチャレンジを発行する。
        if (user.isMfaEnabled()) {
            return LoginResult.mfaRequired(jwtService.issueMfaChallengeToken(user.getId()));
        }
        return issueSession(user);
    }

    /**
     * F-AUTH-01(2段目) MFA コード検証＋ログイン確定（#235・#241）。
     * チャレンジから解決した userId に対し、まず TOTP を検証し、ダメなら未使用リカバリコードと照合する
     * （端末紛失時の自己復旧。一致したコードは消費される）。成功時に access/refresh を発行する。
     * 失敗（MFA 無効化済み・どちらの検証も不一致）は存在を漏らさない汎用エラー（BadCredentials）。
     */
    @Transactional
    public LoginResult verifyMfaAndLogin(Long userId, String code) {
        User user = userRepository.findById(userId).orElseThrow(BadCredentialsException::new);
        if (!user.isMfaEnabled()) {
            throw new BadCredentialsException();
        }
        boolean ok = totpService.verify(secretCipher.decrypt(user.getTotpSecret()), code)
                || recoveryCodeService.consume(userId, code);
        if (!ok) {
            throw new BadCredentialsException();
        }
        if (user.getStatus() != com.reviewboard.domain.user.UserStatus.ACTIVE) {
            throw new org.springframework.security.access.AccessDeniedException("このアカウントは利用できません");
        }
        return issueSession(user);
    }

    private LoginResult issueSession(User user) {
        String access = jwtService.issueAccessToken(user.getId(), user.getRole(), user.getCohortId());
        String refresh = refreshTokenService.issue(user.getId());
        return LoginResult.authenticated(user, access, refresh);
    }

    /** F-AUTH-(extra) リフレッシュ。rotation + reuse 検知は RefreshTokenService が担う。 */
    @Transactional
    public RefreshResult refresh(String rawRefreshToken) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        User user = userRepository.findById(rotation.userId())
                .orElseThrow(() -> new InvalidRefreshTokenException("user not found"));
        String access = jwtService.issueAccessToken(user.getId(), user.getRole(), user.getCohortId());
        return new RefreshResult(access, rotation.newRawToken());
    }

    /** F-AUTH-03 ログアウト。 */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    /**
     * ログイン結果。通常は認証完了（user＋tokens）。MFA 有効時は {@code mfaRequired=true} で
     * tokens は無く、代わりに {@code mfaChallengeToken}（短命）を持つ。
     */
    public record LoginResult(User user, String accessToken, String refreshToken,
                              boolean mfaRequired, String mfaChallengeToken) {

        static LoginResult authenticated(User user, String access, String refresh) {
            return new LoginResult(user, access, refresh, false, null);
        }

        static LoginResult mfaRequired(String challengeToken) {
            return new LoginResult(null, null, null, true, challengeToken);
        }
    }

    public record RefreshResult(String accessToken, String refreshToken) {
    }
}
