package com.reviewboard.domain.review;

import com.reviewboard.domain.auth.AuthPrincipal;
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

    /** F-REV-03 ありがとう（投稿者のみ・冪等） */
    @PostMapping("/api/reviews/{id}/thanks")
    public ResponseEntity<Void> thank(@AuthenticationPrincipal AuthPrincipal principal,
                                      @PathVariable Long id) {
        reviewService.thank(principal, id);
        return ResponseEntity.noContent().build();
    }
}
