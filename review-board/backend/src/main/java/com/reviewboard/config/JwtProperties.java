package com.reviewboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 設定（application.yml の app.jwt.*。env 駆動）。
 *
 * @param secret           HS256 署名鍵（32 文字以上＝256bit 以上必須。env で注入）
 * @param accessTtlSeconds access トークン寿命（短命）
 * @param refreshTtlSeconds refresh トークン寿命
 * @param cookieSecure     Cookie の Secure 属性（本番は true、ローカルは false）
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessTtlSeconds,
        long refreshTtlSeconds,
        boolean cookieSecure) {
}
