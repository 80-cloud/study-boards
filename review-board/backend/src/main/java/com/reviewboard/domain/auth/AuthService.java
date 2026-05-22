package com.reviewboard.domain.auth;

import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
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

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
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
