package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.ReviewAxis;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * レビュー作成リクエスト（F-REV-01）。
 * 「良かった点」「改善提案」は必須、観点別コメントは任意（初心者が全軸埋めなくてよい）。
 */
public record ReviewCreateRequest(
        @NotBlank String good,
        @NotBlank String improvement,
        @Valid List<AxisCommentInput> axisComments) {

    /** 観点別コメント1件。同じ軸は1回まで（Service で重複を弾く）。 */
    public record AxisCommentInput(
            @NotNull ReviewAxis axis,
            @NotBlank String comment) {
    }
}
