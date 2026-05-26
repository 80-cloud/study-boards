package com.reviewboard.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** ある投稿のレビュー一覧（未削除） */
    List<Review> findByPostIdAndDeletedAtIsNull(Long postId);

    /** 単体取得（未削除のみ） */
    Optional<Review> findByIdAndDeletedAtIsNull(Long id);

    /** 成長記録（F-PROF-02）：複数投稿に付いたレビューをまとめて取得（N+1回避） */
    List<Review> findByPostIdInAndDeletedAtIsNull(List<Long> postIds);

    /** cohort 全体のレビュー一覧（#210）：自 cohort の投稿に付いた未削除レビューを新着順で取得 */
    List<Review> findByPostIdInAndDeletedAtIsNullOrderByCreatedAtDesc(List<Long> postIds);

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

    // ---- エンゲージメント計測（#273・運営限定）。cohort 境界は review.postId → post.cohortId の join で絞る ----

    /** cohort 内の未削除レビュー総数。 */
    @Query("select count(r) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null")
    long countReviewsInCohort(@Param("cohortId") Long cohortId);

    /** cohort 内・直近窓（since 以降）の未削除レビュー数。 */
    @Query("select count(r) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null and r.createdAt > :since")
    long countReviewsInCohortSince(@Param("cohortId") Long cohortId, @Param("since") OffsetDateTime since);

    /** cohort 内・直近窓に1件以上レビューした distinct なレビュアー数（週次アクティブレビュアー）。 */
    @Query("select count(distinct r.reviewerUserId) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null and r.createdAt > :since")
    long countDistinctActiveReviewers(@Param("cohortId") Long cohortId, @Param("since") OffsetDateTime since);

    /** 質指標：cohort 内で🙏を1件以上受けた未削除レビュー数（🙏率の分子）。 */
    @Query("select count(r) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null and r.thanksCount > 0")
    long countThankedReviewsInCohort(@Param("cohortId") Long cohortId);

    /** 停滞判定用：cohort 内のレビュアーごとの最終レビュー時刻。返却：{@code [reviewerUserId, max(createdAt)]}。 */
    @Query("select r.reviewerUserId, max(r.createdAt) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null group by r.reviewerUserId")
    List<Object[]> lastReviewAtByReviewer(@Param("cohortId") Long cohortId);

    // ---- 週次トレンド（#275）：期間 [start, end) の集計 ----

    /** cohort 内・期間 [start, end) の非削除レビュー数。 */
    @Query("select count(r) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null and r.createdAt >= :start and r.createdAt < :end")
    long countReviewsInRange(@Param("cohortId") Long cohortId,
                             @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    /** cohort 内・期間 [start, end) の distinct なレビュアー数。 */
    @Query("select count(distinct r.reviewerUserId) from Review r join Post p on p.id = r.postId "
            + "where p.cohortId = :cohortId and r.deletedAt is null and r.createdAt >= :start and r.createdAt < :end")
    long countDistinctReviewersInRange(@Param("cohortId") Long cohortId,
                                       @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}
