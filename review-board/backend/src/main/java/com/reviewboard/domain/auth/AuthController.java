package com.reviewboard.domain.auth;

import com.reviewboard.domain.auth.dto.LoginRequest;
import com.reviewboard.domain.auth.dto.MfaRequiredResponse;
import com.reviewboard.domain.auth.dto.RegisterRequest;
import com.reviewboard.domain.auth.dto.UserResponse;
import com.reviewboard.domain.mfa.dto.MfaCodeRequest;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.storage.StorageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 認証 API（F-AUTH）。トークンは HttpOnly Cookie で受け渡し、レスポンス body には載せない。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookies cookies;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, AuthCookies cookies, UserRepository userRepository,
                          StorageService storageService, JwtService jwtService) {
        this.authService = authService;
        this.cookies = cookies;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.jwtService = jwtService;
    }

    /**
     * F-AUTH-01 ログイン（1段目）。MFA（#235）有効ユーザーは access/refresh を出さず、
     * 短命チャレンジ Cookie を立てて {@code {mfaRequired:true}} を返す（続けて /login/mfa を叩く）。
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request.email(), request.password());
        if (result.mfaRequired()) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookies.mfa(result.mfaChallengeToken()).toString())
                    .body(MfaRequiredResponse.required());
        }
        return sessionResponse(result, 200);
    }

    /**
     * F-AUTH-01 ログイン（2段目・MFA）。チャレンジ Cookie ＋ TOTP コードを検証してセッションを発行する。
     * チャレンジ欠落・不正・期限切れ・コード不一致はいずれも 401（存在を漏らさない）。
     */
    @PostMapping("/login/mfa")
    public ResponseEntity<?> loginMfa(
            @CookieValue(name = AuthCookies.MFA, required = false) String mfaToken,
            @Valid @RequestBody MfaCodeRequest body) {
        if (mfaToken == null || mfaToken.isBlank()) {
            throw new BadCredentialsException();
        }
        Long userId;
        try {
            userId = jwtService.parseMfaChallenge(mfaToken);
        } catch (io.jsonwebtoken.JwtException e) {
            throw new BadCredentialsException();
        }
        AuthService.LoginResult result = authService.verifyMfaAndLogin(userId, body.code());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.access(result.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(result.refreshToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearMfa().toString())
                .body(UserResponse.from(result.user(),
                        storageService.presignedGetUrl(result.user().getAvatarKey())));
    }

    private ResponseEntity<UserResponse> sessionResponse(AuthService.LoginResult result, int status) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookies.access(result.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(result.refreshToken()).toString())
                .body(UserResponse.from(result.user(), storageService.presignedGetUrl(result.user().getAvatarKey())));
    }

    /** F-AUTH-02 招待コードによる受講生の自己登録（公開）。成功時はそのままログイン状態にする。 */
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthService.LoginResult result = authService.register(
                request.code(), request.email(), request.displayName(), request.password());
        return ResponseEntity.status(201)
                .header(HttpHeaders.SET_COOKIE, cookies.access(result.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(result.refreshToken()).toString())
                .body(UserResponse.from(result.user(), storageService.presignedGetUrl(result.user().getAvatarKey())));
    }

    /** F-AUTH-(extra) リフレッシュ（access 再発行 + refresh rotation） */
    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidRefreshTokenException("missing refresh token");
        }
        AuthService.RefreshResult result = authService.refresh(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.access(result.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(result.refreshToken()).toString())
                .build();
    }

    /** F-AUTH-03 ログアウト（refresh 失効 + Cookie 削除） */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString())
                .build();
    }

    /** 認証確認（現在のログインユーザー）。未認証なら SecurityConfig が 401 を返す。 */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        User user = userRepository.findById(principal.userId())
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        return UserResponse.from(user, storageService.presignedGetUrl(user.getAvatarKey()));
    }
}
