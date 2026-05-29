package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.ReviewAxis;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * レビュー作成リクエスト（F-REV-01）。
 * 「良かった点」は必須、「改善提案」「観点別コメント」は任意（書くハードルを下げる：#503）。
 * 改善提案 null/空は Service で空文字に正規化（DB は NOT NULL のまま）。
 */
public record ReviewCreateRequest(
        @NotBlank String good,
        String improvement,
        @Valid List<AxisCommentInput> axisComments) {

    /** 観点別コメント1件。同じ軸は1回まで（Service で重複を弾く）。 */
    public record AxisCommentInput(
            @NotNull ReviewAxis axis,
            @NotBlank String comment) {
    }
}
