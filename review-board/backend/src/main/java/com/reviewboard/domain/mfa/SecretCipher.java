package com.reviewboard.domain.mfa;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * 機微な秘密（TOTP シークレット）の at-rest 暗号化（Issue #249）。AES-256-GCM。
 *
 * <p>保存形式は {@code v1:base64(iv(12B) || ciphertext+tag)}。IV はリクエストごとにランダム
 * （GCM の nonce 再利用を避ける）。鍵は {@code app.mfa.enc-key}（env {@code MFA_ENC_KEY}・
 * base64 の 32 バイト）。本番は SSM SecureString で注入する。
 *
 * <p>後方互換：{@code v1:} 接頭辞の無い値は legacy 平文として {@link #decrypt} がそのまま返す
 * （V17 時代の平文シークレット）。次回 setup で暗号化形式に置き換わるためロックアウトを起こさない。
 *
 * <p>鍵未設定（空）時：暗号化/復号（v1 値）の呼び出し時のみ例外。MFA を使わない運用は影響を受けない。
 */
@Component
public class SecretCipher {

    private static final String PREFIX = "v1:";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;     // GCM 推奨 96bit
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key; // null = 鍵未設定
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${app.mfa.enc-key:}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            this.key = null;
            return;
        }
        byte[] raw = Base64.getDecoder().decode(base64Key.trim());
        if (raw.length != 16 && raw.length != 24 && raw.length != 32) {
            throw new IllegalStateException("app.mfa.enc-key は base64 の 16/24/32 バイト（AES鍵長）で指定してください");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    /** 平文を暗号化し {@code v1:...} 形式で返す。鍵未設定なら例外。 */
    public String encrypt(String plaintext) {
        requireKey();
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("TOTP シークレットの暗号化に失敗しました", e);
        }
    }

    /**
     * 暗号文（{@code v1:...}）を復号する。接頭辞の無い legacy 平文はそのまま返す（後方互換）。
     * v1 値の復号で鍵未設定なら例外。
     */
    public String decrypt(String stored) {
        if (stored == null) {
            return null;
        }
        if (!stored.startsWith(PREFIX)) {
            return stored; // legacy 平文（V17）。次回 setup で暗号化形式に置き換わる。
        }
        requireKey();
        try {
            byte[] all = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            byte[] iv = Arrays.copyOfRange(all, 0, IV_BYTES);
            byte[] ct = Arrays.copyOfRange(all, IV_BYTES, all.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("TOTP シークレットの復号に失敗しました", e);
        }
    }

    private void requireKey() {
        if (key == null) {
            throw new IllegalStateException("MFA_ENC_KEY（app.mfa.enc-key）が未設定です。MFA の暗号化に必要です。");
        }
    }
}
