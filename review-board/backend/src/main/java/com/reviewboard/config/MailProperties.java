package com.reviewboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * メール通知設定（application.yml の app.mail.*・#175）。
 * SMTP 接続そのものは spring.mail.* が持ち、ここは「送るかどうか」と表示情報のみ。
 *
 * @param enabled  true で実送信。既定 false（dev/CI/未設定では no-op＝ログのみ）
 * @param from     送信元アドレス
 * @param baseUrl  メール本文のリンク用ベース URL（例 https://example.com）
 */
@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        boolean enabled,
        String from,
        String baseUrl) {
}
