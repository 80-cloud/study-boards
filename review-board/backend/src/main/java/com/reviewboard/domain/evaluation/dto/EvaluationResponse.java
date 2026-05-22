package com.reviewboard.domain.evaluation.dto;

import com.reviewboard.domain.evaluation.Evaluation;
import com.reviewboard.domain.evaluation.EvaluationResult;

import java.time.OffsetDateTime;

/**
 * 講師の最終評価レスポンス（F-EVAL-01 / F-PROF-04 合格バッジ）。
 * approved=true は成長記録の「合格バッジ」に対応する。
 */
public record EvaluationResponse(
        Long id,
        Long postId,
        Long teacherUserId,
        EvaluationResult result,
        boolean approved,
        String comment,
        OffsetDateTime createdAt) {

    public static EvaluationResponse from(Evaluation e) {
        return new EvaluationResponse(
                e.getId(), e.getPostId(), e.getTeacherUserId(),
                e.getResult(), e.getResult() == EvaluationResult.APPROVED,
                e.getComment(), e.getCreatedAt());
    }
}
