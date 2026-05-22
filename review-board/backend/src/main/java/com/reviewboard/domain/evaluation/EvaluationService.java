package com.reviewboard.domain.evaluation;

import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.evaluation.dto.EvaluationRequest;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 講師の最終評価のユースケース（F-EVAL-01・★S軸の重点）。
 *
 * <p>ロール制御（講師限定）は Controller の {@code @PreAuthorize} で担保する。本サービスは
 * cohort 境界（他 cohort の投稿は 404）と「最新1件＋履歴」の整合を担う。
 */
@Service
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final PostRepository postRepository;

    public EvaluationService(EvaluationRepository evaluationRepository, PostRepository postRepository) {
        this.evaluationRepository = evaluationRepository;
        this.postRepository = postRepository;
    }

    /**
     * F-EVAL-01 評価を付ける。旧 latest を倒し、新規を is_latest=true で積む（履歴保持・母 S-4）。
     * 投稿は評価者（講師）の cohort 内のものに限る（他 cohort は 404）。
     */
    @Transactional
    public Evaluation evaluate(AuthPrincipal principal, Long postId, EvaluationRequest req) {
        Post post = postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));

        evaluationRepository.findByPostIdAndLatestIsTrue(post.getId())
                .ifPresent(prev -> prev.setLatest(false));

        Evaluation eval = new Evaluation();
        eval.setPostId(post.getId());
        eval.setTeacherUserId(principal.userId());
        eval.setResult(req.result());
        eval.setComment(req.comment());
        eval.setLatest(true);
        eval.setCreatedAt(OffsetDateTime.now());
        return evaluationRepository.save(eval);
    }

    /** 最新評価の取得（同 cohort のみ可視）。未評価は 404。 */
    @Transactional(readOnly = true)
    public Evaluation getLatest(AuthPrincipal principal, Long postId) {
        // 投稿の可視性（cohort 境界）を先に確認
        postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
        return evaluationRepository.findByPostIdAndLatestIsTrue(postId)
                .orElseThrow(() -> new ResourceNotFoundException("evaluation not found for post: " + postId));
    }
}
