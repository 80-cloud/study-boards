package com.reviewboard.domain.review;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.review.dto.GrowthUpdateRequest;
import com.reviewboard.domain.review.dto.ReplyRequest;
import com.reviewboard.domain.review.dto.ReplyResponse;
import com.reviewboard.domain.review.dto.CohortReviewResponse;
import com.reviewboard.domain.review.dto.ReviewCreateRequest;
import com.reviewboard.domain.review.dto.ReviewResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * レビュー API（F-REV）。すべて認証必須。cohort 境界・自己レビュー禁止・所有者・ありがとう権限の
 * 判定は {@link ReviewService} に集約する（★S軸・認可の一元化）。
 */
@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /** F-REV-01 作成（同 cohort の投稿のみ・自己レビュー禁止） */
    @PostMapping("/api/posts/{postId}/reviews")
    public ResponseEntity<ReviewResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                                 @PathVariable Long postId,
                                                 @Valid @RequestBody ReviewCreateRequest request) {
        ReviewResponse res = reviewService.create(principal, postId, request);
        return ResponseEntity.created(URI.create("/api/reviews/" + res.id())).body(res);
    }

    /**
     * cohort 全体のレビュー一覧（#210）。★S軸：自 cohort の投稿に付いたレビューのみ（越境しない）。
     * トップ統計「レビュー」タイルからの導線。投稿タイトル付きで新着順に返す。
     */
    @GetMapping("/api/reviews")
    public List<CohortReviewResponse> listForCohort(@AuthenticationPrincipal AuthPrincipal principal) {
        return reviewService.listForCohort(principal);
    }

    /** F-REV-01/02 一覧（reviewer の role を含む＝講師の特別表示が可能） */
    @GetMapping("/api/posts/{postId}/reviews")
    public List<ReviewResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
                                     @PathVariable Long postId) {
        return reviewService.listForPost(principal, postId);
    }

    /** F-REV 編集（所有者のみ） */
    @PutMapping("/api/reviews/{id}")
    public ReviewResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                                 @PathVariable Long id,
                                 @Valid @RequestBody ReviewCreateRequest request) {
        return reviewService.update(principal, id, request);
    }

    /** F-REV 論理削除（所有者のみ） */
    @DeleteMapping("/api/reviews/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id) {
        reviewService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** #496 P5：30 秒以内なら復元（所有者のみ・期限超過は 404） */
    @PostMapping("/api/reviews/{id}/restore")
    public ResponseEntity<Void> restore(@AuthenticationPrincipal AuthPrincipal principal,
                                        @PathVariable Long id) {
        reviewService.restore(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** F-REV-03 ありがとう（投稿者のみ・冪等） */
    @PostMapping("/api/reviews/{id}/thanks")
    public ResponseEntity<Void> thank(@AuthenticationPrincipal AuthPrincipal principal,
                                      @PathVariable Long id) {
        reviewService.thank(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** F-GROW-01 対応状態の更新（投稿者本人のみ・他人は 403／他 cohort は 404） */
    @PutMapping("/api/reviews/{id}/growth")
    public ReviewResponse updateGrowth(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody GrowthUpdateRequest request) {
        return reviewService.updateGrowth(principal, id, request.status(), request.beforeAfter());
    }

    /** F-REV-04 返信作成（同 cohort のメンバー） */
    @PostMapping("/api/reviews/{id}/replies")
    public ResponseEntity<ReplyResponse> reply(@AuthenticationPrincipal AuthPrincipal principal,
                                               @PathVariable Long id,
                                               @Valid @RequestBody ReplyRequest request) {
        ReplyResponse res = reviewService.createReply(principal, id, request.body());
        return ResponseEntity.created(URI.create("/api/replies/" + res.id())).body(res);
    }

    /** F-REV-04 返信一覧（古い順・同 cohort） */
    @GetMapping("/api/reviews/{id}/replies")
    public List<ReplyResponse> replies(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id) {
        return reviewService.listReplies(principal, id);
    }

    /** F-REV-04 返信の論理削除（返信者本人のみ） */
    @DeleteMapping("/api/replies/{id}")
    public ResponseEntity<Void> deleteReply(@AuthenticationPrincipal AuthPrincipal principal,
                                            @PathVariable Long id) {
        reviewService.deleteReply(principal, id);
        return ResponseEntity.noContent().build();
    }
}
