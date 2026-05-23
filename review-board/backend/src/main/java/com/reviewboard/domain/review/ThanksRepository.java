package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ThanksRepository extends JpaRepository<Thanks, Long> {

    boolean existsByReviewIdAndFromUserId(Long reviewId, Long fromUserId);

    // ---- S-3 再計算バッチ用 ----

    /** レビューの thanks_count の正：そのレビューに付いた ありがとう 数 */
    int countByReviewId(Long reviewId);

    /** ユーザーの thanks_received_count の正：本人の未削除レビューに付いた ありがとう 総数 */
    @Query("select count(t) from Thanks t where t.reviewId in "
            + "(select r.id from Review r where r.deletedAt is null and r.reviewerUserId = :reviewerId)")
    int countThanksReceivedByReviewer(@Param("reviewerId") Long reviewerId);
}
