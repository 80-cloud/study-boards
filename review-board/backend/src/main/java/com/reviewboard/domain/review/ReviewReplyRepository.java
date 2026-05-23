package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewReplyRepository extends JpaRepository<ReviewReply, Long> {

    /** あるレビューの返信（未削除・古い順＝スレッドの流れ） */
    List<ReviewReply> findByReviewIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long reviewId);

    /** 単体取得（未削除のみ） */
    Optional<ReviewReply> findByIdAndDeletedAtIsNull(Long id);
}
