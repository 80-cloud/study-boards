package com.reviewboard.domain.passwordreset;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * パスワードリセット設定（application.yml の app.password-reset.*。Issue #231）。
 *
 * @param ttlSeconds 発行トークンの有効期間（秒）。短命にして漏洩窓を狭める（既定 1 時間）。
 */
@ConfigurationProperties(prefix = "app.password-reset")
public record PasswordResetProperties(
        long ttlSeconds) {
}
