package com.reviewboard.domain.auth;

import com.reviewboard.config.JwtProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * refresh トークンの発行・rotation・revoke・reuse 検知（母 SEC-7）。
 *
 * <p>平文は保存せず SHA-256 ハッシュのみ DB に持つ。refresh のたびに使い捨て rotation。
 * 既に失効済みのトークンが再提示されたら「盗用（reuse）」とみなし、当該ユーザーの
 * 全トークンを失効させる。
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final long refreshTtlSeconds;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository, JwtProperties props) {
        this.repository = repository;
        this.refreshTtlSeconds = props.refreshTtlSeconds();
    }

    /** 新規 refresh トークンを発行し、生トークン（Cookie 用）を返す。DB にはハッシュを保存。 */
    @Transactional
    public String issue(Long userId) {
        String raw = randomToken();
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(sha256(raw));
        OffsetDateTime now = OffsetDateTime.now();
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusSeconds(refreshTtlSeconds));
        repository.save(token);
        return raw;
    }

    /**
     * rotation：生トークンを検証し、有効なら失効させて新トークンを発行する。
     *
     * @return 新しい生 refresh トークン
     * @throws InvalidRefreshTokenException 未知/期限切れ、または reuse 検知時
     */
    @Transactional
    public RotationResult rotate(String rawToken) {
        RefreshToken stored = repository.findByTokenHash(sha256(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("unknown refresh token"));

        if (stored.getRevokedAt() != null) {
            // 失効済みトークンの再提示 ＝ 盗用の疑い。当該ユーザーの全トークンを失効。
            repository.revokeAllActiveByUserId(stored.getUserId(), OffsetDateTime.now());
            throw new InvalidRefreshTokenException("refresh token reuse detected");
        }
        if (stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new InvalidRefreshTokenException("refresh token expired");
        }

        stored.setRevokedAt(OffsetDateTime.now());
        String newRaw = issue(stored.getUserId());
        return new RotationResult(stored.getUserId(), newRaw);
    }

    /** ログアウト：当該トークンを失効（未知でも黙って成功＝列挙を防ぐ）。 */
    @Transactional
    public void revoke(String rawToken) {
        Optional<RefreshToken> stored = repository.findByTokenHash(sha256(rawToken));
        stored.ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(OffsetDateTime.now());
            }
        });
    }

    public record RotationResult(Long userId, String newRawToken) {
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash); // 64 文字 hex（refresh_tokens.token_hash CHAR(64)）
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
