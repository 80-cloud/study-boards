package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewAxisCommentRepository extends JpaRepository<ReviewAxisComment, Long> {

    List<ReviewAxisComment> findByReviewId(Long reviewId);

    List<ReviewAxisComment> findByReviewIdIn(List<Long> reviewIds);

    /**
     * 質指標（#273）：cohort 内の未削除レビューに紐づく観点コメント総数。
     * avg観点数/レビュー の分子（分母は未削除レビュー総数）。
     */
    @Query("select count(c) from ReviewAxisComment c "
            + "join Review r on r.id = c.reviewId join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null")
    long countAxisCommentsInCohort(@Param("cohortId") Long cohortId);
}
