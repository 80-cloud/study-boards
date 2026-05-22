package com.reviewboard.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * オブジェクトストレージ設定（application.yml の app.storage.s3.*。env 駆動・SEC-9）。
 * ローカルは MinIO（S3 互換）、本番は AWS S3 を同じインタフェースで使う。
 *
 * @param endpoint        S3 エンドポイント（MinIO は http://localhost:9002。AWS は null で既定解決）
 * @param bucket          バケット名（成果物スクショを private 保存）
 * @param region          リージョン
 * @param accessKey       アクセスキー（env。平文ハードコード禁止）
 * @param secretKey       シークレットキー（env。平文ハードコード禁止）
 * @param presignTtlSeconds 表示用 署名付き GET URL の寿命（短命＝漏えい時の窓を狭める）
 * @param maxUploadBytes  アップロード上限バイト数（サービス側の二重チェック）
 */
@ConfigurationProperties(prefix = "app.storage.s3")
public record StorageProperties(
        String endpoint,
        String bucket,
        String region,
        String accessKey,
        String secretKey,
        long presignTtlSeconds,
        long maxUploadBytes) {
}
