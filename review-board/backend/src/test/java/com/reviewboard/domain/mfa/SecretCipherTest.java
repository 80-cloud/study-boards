package com.reviewboard.domain.mfa;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TOTP シークレット at-rest 暗号化（#249）の単体テスト。Spring 不要・鍵を直接渡す。
 */
class SecretCipherTest {

    private static final String KEY = Base64.getEncoder()
            .encodeToString("test-mfa-enc-key-32-bytes-long!!".getBytes(StandardCharsets.UTF_8));

    private final SecretCipher cipher = new SecretCipher(KEY);

    @Test
    void encrypt_then_decrypt_roundtrips() {
        String plain = "JBSWY3DPEHPK3PXP"; // Base32 TOTP シークレット相当
        String enc = cipher.encrypt(plain);
        assertThat(enc).startsWith("v1:").isNotEqualTo(plain);
        assertThat(cipher.decrypt(enc)).isEqualTo(plain);
    }

    @Test
    void encrypt_uses_random_iv_so_ciphertexts_differ() {
        String plain = "SAMESECRET123456";
        assertThat(cipher.encrypt(plain)).isNotEqualTo(cipher.encrypt(plain));
        // ただしどちらも同じ平文に復号できる。
        assertThat(cipher.decrypt(cipher.encrypt(plain))).isEqualTo(plain);
    }

    @Test
    void decrypt_passes_through_legacy_plaintext() {
        // v1: 接頭辞の無い値（V17 時代の平文）はそのまま返す（後方互換）。
        assertThat(cipher.decrypt("LEGACYPLAINTEXT1")).isEqualTo("LEGACYPLAINTEXT1");
    }

    @Test
    void decrypt_null_is_null() {
        assertThat(cipher.decrypt(null)).isNull();
    }

    @Test
    void no_key_fails_only_on_use() {
        SecretCipher noKey = new SecretCipher("");
        // 鍵未設定でも legacy 平文の読み取りは可能（MFA 未使用運用は無影響）。
        assertThat(noKey.decrypt("plain")).isEqualTo("plain");
        assertThat(noKey.decrypt(null)).isNull();
        // 暗号化・v1 値の復号は明確に失敗。
        assertThatThrownBy(() -> noKey.encrypt("x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> noKey.decrypt("v1:zzzz")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void invalid_key_length_is_rejected() {
        assertThatThrownBy(() -> new SecretCipher(Base64.getEncoder().encodeToString("short".getBytes())))
                .isInstanceOf(IllegalStateException.class);
    }
}
