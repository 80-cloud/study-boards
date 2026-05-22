package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** ある投稿のレビュー一覧（未削除） */
    List<Review> findByPostIdAndDeletedAtIsNull(Long postId);

    /** 単体取得（未削除のみ） */
    Optional<Review> findByIdAndDeletedAtIsNull(Long id);

    /** 成長記録（F-PROF-02）：複数投稿に付いたレビューをまとめて取得（N+1回避） */
    List<Review> findByPostIdInAndDeletedAtIsNull(List<Long> postIds);

    /** したレビュー実績（F-PROF-03） */
    List<Review> findByReviewerUserIdAndDeletedAtIsNull(Long reviewerUserId);
}
