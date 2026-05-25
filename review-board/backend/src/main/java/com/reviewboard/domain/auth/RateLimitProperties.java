package com.reviewboard.domain.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 認証エンドポイントのレートリミット設定（application.yml の app.ratelimit.*。SEC-12）。
 *
 * @param enabled       有効化（既定 true）。テストでは状態クリアで対応するため無効化はしない。
 * @param windowSeconds 集計窓（秒）。固定窓。
 * @param loginMax      窓あたりの /api/auth/login 上限（IP 単位）
 * @param registerMax   窓あたりの /api/auth/register 上限（IP 単位）
 * @param refreshMax    窓あたりの /api/auth/refresh 上限（IP 単位）
 * @param passwordResetMax 窓あたりの /api/auth/password-reset/request 上限（IP 単位・列挙/送信乱用対策）
 */
@ConfigurationProperties(prefix = "app.ratelimit")
public record RateLimitProperties(
        boolean enabled,
        int windowSeconds,
        int loginMax,
        int registerMax,
        int refreshMax,
        int passwordResetMax) {
}
