package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** ある投稿のレビュー一覧（未削除） */
    List<Review> findByPostIdAndDeletedAtIsNull(Long postId);

    /** したレビュー実績（F-PROF-03） */
    List<Review> findByReviewerUserIdAndDeletedAtIsNull(Long reviewerUserId);
}
