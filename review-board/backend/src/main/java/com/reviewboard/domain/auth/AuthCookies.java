package com.reviewboard.domain.auth;

import com.reviewboard.config.JwtProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * 認証 Cookie（HttpOnly + Secure + SameSite=Strict）の組み立て。
 * SameSite=Strict で CSRF を緩和する（テスト計画書 §7）。
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "access_token";
    public static final String REFRESH = "refresh_token";
    /** MFA チャレンジ（パスワード検証済み・TOTP 待ち）の短命 Cookie（#235）。 */
    public static final String MFA = "mfa_token";
    /** refresh / mfa は認証エンドポイントにのみ送られれば十分（露出面を狭める） */
    private static final String REFRESH_PATH = "/api/auth";
    /** MFA チャレンジ Cookie の寿命（秒）。JwtService のチャレンジ寿命と揃える。 */
    private static final long MFA_MAX_AGE = 300;

    private final JwtProperties props;

    public AuthCookies(JwtProperties props) {
        this.props = props;
    }

    public ResponseCookie access(String token) {
        return base(ACCESS, token, "/", props.accessTtlSeconds());
    }

    public ResponseCookie refresh(String token) {
        return base(REFRESH, token, REFRESH_PATH, props.refreshTtlSeconds());
    }

    /** MFA チャレンジ Cookie（短命・/api/auth に限定）。 */
    public ResponseCookie mfa(String token) {
        return base(MFA, token, REFRESH_PATH, MFA_MAX_AGE);
    }

    public ResponseCookie clearAccess() {
        return base(ACCESS, "", "/", 0);
    }

    public ResponseCookie clearRefresh() {
        return base(REFRESH, "", REFRESH_PATH, 0);
    }

    public ResponseCookie clearMfa() {
        return base(MFA, "", REFRESH_PATH, 0);
    }

    private ResponseCookie base(String name, String value, String path, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAgeSeconds)
                .build();
    }
}
