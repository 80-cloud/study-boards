package com.reviewboard.domain.invite;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 招待コード生成（Issue #165）。{@link SecureRandom}（CSPRNG）で 32 byte の乱数を
 * URL-safe Base64（パディングなし・約 43 文字）にエンコードする。{@code Math.random()} は使わない。
 *
 * <p>生コードは発行時に 1 度だけ返し、DB には {@link #hash(String)}（SHA-256 hex）で保存する。
 * 検証は raw 比較ではなく hash の UNIQUE lookup で行う（refresh token と同方針・timing 比較なし）。
 */
@Component
public class InviteCodeGenerator {

    /** 32 byte = 256 bit。Base64url（パディングなし）で約 43 文字。 */
    private static final int CODE_BYTES = 32;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder urlEncoder = Base64.getUrlEncoder().withoutPadding();

    /** 新しい生招待コードを生成する（呼び出し側で {@link #hash(String)} して保存）。 */
    public String generateRawCode() {
        byte[] bytes = new byte[CODE_BYTES];
        secureRandom.nextBytes(bytes);
        return urlEncoder.encodeToString(bytes);
    }

    /** 生コードを CHAR(64) の SHA-256 hex に変換する（DB 保管・検索キー）。 */
    public String hash(String rawCode) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawCode.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 が利用できません", e);
        }
    }
}
