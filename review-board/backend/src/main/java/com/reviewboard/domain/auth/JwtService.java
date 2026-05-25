package com.reviewboard.domain.auth;

import com.reviewboard.config.JwtProperties;
import com.reviewboard.domain.user.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * access トークン（JWT・HS256）の発行と検証。
 * 認可に必要な userId / role / cohortId をクレームに載せる（クライアント入力を信用しない）。
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTtlSeconds;
    /** MFA チャレンジ（パスワード検証済み・TOTP 待ち）の寿命。短命にして窓を狭める（#235）。 */
    private static final long MFA_CHALLENGE_TTL_SECONDS = 300; // 5 分
    private static final String MFA_PURPOSE = "mfa";

    public JwtService(JwtProperties props) {
        byte[] secretBytes = props.secret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            // HS256 は 256bit 以上必須。短い秘密は起動時に弾く（fail-fast）。
            throw new IllegalStateException("app.jwt.secret は 32 文字（256bit）以上にしてください");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.accessTtlSeconds = props.accessTtlSeconds();
    }

    /** access トークンを発行する。 */
    public String issueAccessToken(Long userId, UserRole role, Long cohortId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .claim("cohortId", cohortId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTtlSeconds)))
                .signWith(key)
                .compact();
    }

    /**
     * MFA チャレンジトークンを発行する（#235）。パスワード検証済みだが TOTP 未確認の中間状態を表す。
     * purpose=mfa の claim を持ち、access/refresh とは用途を分離する（access として使えない）。
     */
    public String issueMfaChallengeToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("purpose", MFA_PURPOSE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(MFA_CHALLENGE_TTL_SECONDS)))
                .signWith(key)
                .compact();
    }

    /**
     * MFA チャレンジトークンを検証して userId を返す。purpose=mfa でなければ不正。
     * 署名不正・期限切れ・purpose 不一致は {@link JwtException} で失敗（呼び出し側で 401）。
     */
    public Long parseMfaChallenge(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        if (!MFA_PURPOSE.equals(claims.get("purpose", String.class))) {
            throw new JwtException("not an mfa challenge token");
        }
        return Long.valueOf(claims.getSubject());
    }

    /**
     * access トークンを検証して principal を取り出す。
     * 署名不正・期限切れ等は {@link JwtException} 系で失敗（呼び出し側で握って未認証扱い）。
     */
    public AuthPrincipal parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Long userId = Long.valueOf(claims.getSubject());
        UserRole role = UserRole.valueOf(claims.get("role", String.class));
        Long cohortId = claims.get("cohortId", Number.class).longValue();
        return new AuthPrincipal(userId, cohortId, role);
    }
}
