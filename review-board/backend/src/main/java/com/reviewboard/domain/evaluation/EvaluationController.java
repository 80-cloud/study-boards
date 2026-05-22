package com.reviewboard.domain.evaluation;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.evaluation.dto.EvaluationRequest;
import com.reviewboard.domain.evaluation.dto.EvaluationResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 講師の最終評価 API（F-EVAL-01・★S軸）。
 * 評価作成は {@code @PreAuthorize("hasRole('TEACHER')")} で講師に限定し、受講生の権限昇格を 403 で弾く。
 * 取得は同 cohort のメンバーなら可（成長記録の合格バッジ表示に使う）。
 */
@RestController
@RequestMapping("/api/posts/{postId}/evaluation")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    /** F-EVAL-01 評価を付ける（講師ロール限定） */
    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping
    public ResponseEntity<EvaluationResponse> evaluate(@AuthenticationPrincipal AuthPrincipal principal,
                                                       @PathVariable Long postId,
                                                       @Valid @RequestBody EvaluationRequest request) {
        Evaluation eval = evaluationService.evaluate(principal, postId, request);
        return ResponseEntity.ok(EvaluationResponse.from(eval));
    }

    /** 最新評価の取得（同 cohort 可視・未評価は 404） */
    @GetMapping
    public EvaluationResponse getLatest(@AuthenticationPrincipal AuthPrincipal principal,
                                        @PathVariable Long postId) {
        return EvaluationResponse.from(evaluationService.getLatest(principal, postId));
    }
}
