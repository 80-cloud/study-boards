package com.reviewboard.domain.post.dto;

import jakarta.validation.constraints.NotNull;

/** F-REV-05 ベストレビュー選択リクエスト（投稿者が選ぶレビュー ID）。 */
public record BestReviewRequest(@NotNull Long reviewId) {
}
