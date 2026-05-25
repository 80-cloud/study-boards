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

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, RefreshTokenService refreshTokenService,
                       InviteService inviteService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.inviteService = inviteService;
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

        String access = jwtService.issueAccessToken(user.getId(), user.getRole(), user.getCohortId());
        String refresh = refreshTokenService.issue(user.getId());
        return new LoginResult(user, access, refresh);
    }

    /** F-AUTH-01 ログイン。失敗は存在を漏らさない汎用エラー（BadCredentials）。 */
    @Transactional
    public LoginResult login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElseThrow(BadCredentialsException::new);
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new BadCredentialsException();
        }
        String access = jwtService.issueAccessToken(user.getId(), user.getRole(), user.getCohortId());
        String refresh = refreshTokenService.issue(user.getId());
        return new LoginResult(user, access, refresh);
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

    public record LoginResult(User user, String accessToken, String refreshToken) {
    }

    public record RefreshResult(String accessToken, String refreshToken) {
    }
}
