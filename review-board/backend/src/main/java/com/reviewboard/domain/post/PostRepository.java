package com.reviewboard.domain.post;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    /** 単体取得も cohort 境界で絞る（他 cohort は不可視＝404 に倒す） */
    Optional<Post> findByIdAndCohortIdAndDeletedAtIsNull(Long id, Long cohortId);

    /** Undo 復元用：削除済みも含めて cohort 境界で取得（30s grace window はサービス側で判定） */
    Optional<Post> findByIdAndCohortId(Long id, Long cohortId);

    /** 成長記録（F-PROF-01）：あるユーザーの投稿履歴（未削除・新しい順） */
    List<Post> findByAuthorUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long authorUserId);

    /** ランディング統計：cohort 内の未削除投稿（集計の母集合）。 */
    List<Post> findByCohortIdAndDeletedAtIsNull(Long cohortId);

    /** 週次ダイジェスト（C-5・#233）：cohort 内の未レビュー（review_count=0）成果物の件数。 */
    int countByCohortIdAndDeletedAtIsNullAndReviewCount(Long cohortId, int reviewCount);

    // ---- エンゲージメント計測（#273・運営限定・compute-on-read） ----

    /** cohort 内の非削除投稿総数（レビュー網羅率の分母）。 */
    long countByCohortIdAndDeletedAtIsNull(Long cohortId);

    /** cohort 内・直近窓（since 以降）の非削除投稿数。 */
    long countByCohortIdAndDeletedAtIsNullAndCreatedAtAfter(Long cohortId, OffsetDateTime since);

    /** cohort 内・ベスト選出済み（best_review_id 非 null）の非削除投稿数（質指標）。 */
    long countByCohortIdAndDeletedAtIsNullAndBestReviewIdIsNotNull(Long cohortId);

    /**
     * time-to-first-review 用：直近窓の各投稿について「投稿時刻」と「最初の未削除レビュー時刻（無ければ null）」を返す。
     * percentile は DB 非依存とするため duration の算出・集計は Java 側で行う。
     * 返却：{@code [postId, postCreatedAt, firstReviewAtOrNull]}。
     */
    @Query("""
            select p.id, p.createdAt, min(r.createdAt)
            from Post p left join Review r on r.postId = p.id and r.deletedAt is null
            where p.cohortId = :cohortId and p.deletedAt is null and p.createdAt > :since
            group by p.id, p.createdAt
            """)
    List<Object[]> firstReviewTimings(@Param("cohortId") Long cohortId, @Param("since") OffsetDateTime since);

    /** cohort 内・直近窓に投稿した distinct な投稿者数（週次アクティブ投稿者）。 */
    @Query("select count(distinct p.authorUserId) from Post p "
            + "where p.cohortId = :cohortId and p.deletedAt is null and p.createdAt > :since")
    long countDistinctActivePosters(@Param("cohortId") Long cohortId, @Param("since") OffsetDateTime since);

    /** 停滞判定用：cohort 内の投稿者ごとの最終投稿時刻。返却：{@code [authorUserId, max(createdAt)]}。 */
    @Query("select p.authorUserId, max(p.createdAt) from Post p "
            + "where p.cohortId = :cohortId and p.deletedAt is null group by p.authorUserId")
    List<Object[]> lastPostAtByAuthor(@Param("cohortId") Long cohortId);

    // ---- 週次トレンド（#275）：期間 [start, end) の集計（週バケットをループで叩く） ----

    /** cohort 内・期間 [start, end) の非削除投稿数。 */
    @Query("select count(p) from Post p where p.cohortId = :cohortId and p.deletedAt is null "
            + "and p.createdAt >= :start and p.createdAt < :end")
    long countPostsInRange(@Param("cohortId") Long cohortId,
                           @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    /** cohort 内・期間 [start, end) の distinct な投稿者数。 */
    @Query("select count(distinct p.authorUserId) from Post p where p.cohortId = :cohortId and p.deletedAt is null "
            + "and p.createdAt >= :start and p.createdAt < :end")
    long countDistinctPostersInRange(@Param("cohortId") Long cohortId,
                                     @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    /**
     * 一覧・検索・絞り込み（F-POST-03 / F-SEARCH-01 / F-FILTER-01）。
     * ★cohort 境界（IDOR 遮断）は常に効かせたまま、任意条件を AND で重ねる。
     * <ul>
     *   <li>{@code q}：タイトル/説明の部分一致（大文字小文字無視）。null/空なら無視。</li>
     *   <li>{@code aspects}/{@code tones}：キーワードから解決した観点・トーン。投稿のタグに一致すれば
     *       本文に無くてもヒットさせる（F-SEARCH-01「観点から探す」）。空集合なら一致しない。</li>
     *   <li>{@code status}：募集状態（OPEN/CLOSED）。null なら無視。</li>
     *   <li>{@code unreviewedOnly}：true なら未レビュー（review_count = 0）のみ。</li>
     *   <li>{@code approvedOnly}：true なら最新評価が「合格」の投稿のみ（合格バッジ一覧・#210）。</li>
     * </ul>
     * 並び順は {@link Pageable} の Sort で与える（新着 / レビュー数）。
     */
    @Query("""
            select p from Post p
            where p.cohortId = :cohortId and p.deletedAt is null
              and (cast(:q as string) is null
                   or lower(p.title) like lower(concat('%', cast(:q as string), '%'))
                   or lower(p.description) like lower(concat('%', cast(:q as string), '%'))
                   or exists (select 1 from p.reviewAspects asp where asp in :aspects)
                   or exists (select 1 from p.reviewTones tn where tn in :tones))
              and (:status is null or p.recruitStatus = :status)
              and (:unreviewedOnly = false or p.reviewCount = 0)
              and (:approvedOnly = false
                   or exists (select 1 from Evaluation e
                              where e.postId = p.id and e.latest = true
                                and e.result = com.reviewboard.domain.evaluation.EvaluationResult.APPROVED))
            """)
    Slice<Post> search(@Param("cohortId") Long cohortId,
                       @Param("q") String q,
                       @Param("aspects") Collection<ReviewAspect> aspects,
                       @Param("tones") Collection<ReviewTone> tones,
                       @Param("status") RecruitStatus status,
                       @Param("unreviewedOnly") boolean unreviewedOnly,
                       @Param("approvedOnly") boolean approvedOnly,
                       Pageable pageable);
}
