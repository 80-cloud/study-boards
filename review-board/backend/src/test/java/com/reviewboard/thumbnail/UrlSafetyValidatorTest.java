package com.reviewboard.thumbnail;

import com.reviewboard.common.InvalidRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ★SSRF 遮断（セキュリティ）の単体テスト。内部到達に使える URL を確実に拒否することを担保する。
 * IP リテラルは DNS を引かずに判定できるため、ネットワーク非依存で検証できる。
 */
class UrlSafetyValidatorTest {

    private final UrlSafetyValidator validator = new UrlSafetyValidator();

    /** 内部・非公開・危険なスキームはすべて拒否。 */
    @ParameterizedTest
    @ValueSource(strings = {
            "http://127.0.0.1/",            // ループバック
            "http://localhost/",            // ループバック名
            "http://169.254.169.254/latest/meta-data/", // クラウドメタデータ（link-local）
            "http://10.0.0.5/",             // サイトローカル(10/8)
            "http://192.168.1.1/",          // サイトローカル(192.168/16)
            "http://172.16.0.10/",          // サイトローカル(172.16/12)
            "http://100.64.0.1/",           // CGNAT(100.64/10)
            "http://0.0.0.0/",              // any-local
            "http://[::1]/",                // IPv6 ループバック
            "file:///etc/passwd",           // 危険スキーム
            "ftp://example.com/",           // 非 http(s)
    })
    void rejects_internal_or_dangerous(String url) {
        assertThatThrownBy(() -> validator.verifyPublicHttpUrl(url))
                .isInstanceOf(InvalidRequestException.class);
    }

    /** 空・null・ホスト無しも拒否。 */
    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "http://", "https:///path"})
    void rejects_blank_or_hostless(String url) {
        assertThatThrownBy(() -> validator.verifyPublicHttpUrl(url))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejects_null() {
        assertThatThrownBy(() -> validator.verifyPublicHttpUrl(null))
                .isInstanceOf(InvalidRequestException.class);
    }

    /** 公開 IP リテラルは許可（DNS 非依存で安定）。 */
    @Test
    void allows_public_ip_literal() {
        assertThatCode(() -> validator.verifyPublicHttpUrl("https://8.8.8.8/"))
                .doesNotThrowAnyException();
        assertThatCode(() -> validator.verifyPublicHttpUrl("http://1.1.1.1:8080/app"))
                .doesNotThrowAnyException();
    }
}
