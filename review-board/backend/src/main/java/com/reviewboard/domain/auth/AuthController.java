package com.reviewboard.domain.auth;

import com.reviewboard.domain.auth.dto.LoginRequest;
import com.reviewboard.domain.auth.dto.UserResponse;
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

    public AuthController(AuthService authService, AuthCookies cookies, UserRepository userRepository,
                          StorageService storageService) {
        this.authService = authService;
        this.cookies = cookies;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    /** F-AUTH-01 ログイン */
    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request.email(), request.password());
        return ResponseEntity.ok()
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
