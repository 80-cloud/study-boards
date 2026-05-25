package com.reviewboard.thumbnail;

/**
 * 投稿の保存後に自動サムネ撮影を要求するドメインイベント。
 * PostService が（TX 内で）publish し、{@link ThumbnailCaptureService} が AFTER_COMMIT で受ける。
 */
public record PostThumbnailRequested(Long postId, Long cohortId, String demoUrl) {
}
