package com.reviewboard.storage.dto;

/**
 * アップロード結果。{@code key} を投稿の screenshotKey に渡し、{@code url} は即時プレビュー用の署名付き URL。
 */
public record UploadResponse(String key, String url) {
}
