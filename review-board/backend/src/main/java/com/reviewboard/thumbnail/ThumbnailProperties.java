package com.reviewboard.thumbnail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 自動サムネ撮影の設定（application.yml の app.thumbnail.*。env 駆動）。
 *
 * @param autoCaptureEnabled 自動撮影の有効化フラグ。既定 false。本番 t3.micro は当面 OFF
 *                           （OOM / SSRF 面を出さない）。dev のみ ON にして検証する。
 * @param chromePath         ヘッドレス Chrome/Chromium の実行ファイルパス（OS で異なる）。空なら撮影しない。
 * @param viewportWidth      撮影ビューポート幅
 * @param viewportHeight     撮影ビューポート高（カードのサムネ比率に合わせる）
 * @param timeoutMs          1 撮影あたりの上限時間（超過でプロセス強制終了）
 */
@ConfigurationProperties(prefix = "app.thumbnail")
public record ThumbnailProperties(
        boolean autoCaptureEnabled,
        String chromePath,
        int viewportWidth,
        int viewportHeight,
        long timeoutMs) {
}
