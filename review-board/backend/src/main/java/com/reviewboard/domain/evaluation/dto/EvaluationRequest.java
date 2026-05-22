package com.reviewboard.domain.evaluation.dto;

import com.reviewboard.domain.evaluation.EvaluationResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 講師の最終評価リクエスト（F-EVAL-01）。result と評価コメントは必須。
 */
public record EvaluationRequest(
        @NotNull EvaluationResult result,
        @NotBlank String comment) {
}
