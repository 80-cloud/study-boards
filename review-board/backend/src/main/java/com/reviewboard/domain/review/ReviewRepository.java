package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // ---- S-3 再計算バッチ用：権威ソースからの件数 ----

    /** 投稿の review_count の正：未削除レビュー数 */
    int countByPostIdAndDeletedAtIsNull(Long postId);

    /** ユーザーの given_reviews_count の正：本人が書いた未削除レビュー数 */
    int countByReviewerUserIdAndDeletedAtIsNull(Long reviewerUserId);

    /** ユーザーの received_reviews_count の正：本人の投稿に付いた未削除レビュー数 */
    @Query("select count(r) from Review r where r.deletedAt is null "
            + "and r.postId in (select p.id from Post p where p.authorUserId = :authorId)")
    int countReceivedForAuthor(@Param("authorId") Long authorId);
}
