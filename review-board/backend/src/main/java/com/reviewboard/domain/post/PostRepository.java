package com.reviewboard.domain.post;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    /** 単体取得も cohort 境界で絞る（他 cohort は不可視＝404 に倒す） */
    Optional<Post> findByIdAndCohortIdAndDeletedAtIsNull(Long id, Long cohortId);

    /** 成長記録（F-PROF-01）：あるユーザーの投稿履歴（未削除・新しい順） */
    List<Post> findByAuthorUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long authorUserId);

    /** ランディング統計：cohort 内の未削除投稿（集計の母集合）。 */
    List<Post> findByCohortIdAndDeletedAtIsNull(Long cohortId);

    /**
     * 一覧・検索・絞り込み（F-POST-03 / F-SEARCH-01 / F-FILTER-01）。
     * ★cohort 境界（IDOR 遮断）は常に効かせたまま、任意条件を AND で重ねる。
     * <ul>
     *   <li>{@code q}：タイトル/説明の部分一致（大文字小文字無視）。null/空なら無視。</li>
     *   <li>{@code aspects}/{@code tones}：キーワードから解決した観点・トーン。投稿のタグに一致すれば
     *       本文に無くてもヒットさせる（F-SEARCH-01「観点から探す」）。空集合なら一致しない。</li>
     *   <li>{@code status}：募集状態（OPEN/CLOSED）。null なら無視。</li>
     *   <li>{@code unreviewedOnly}：true なら未レビュー（review_count = 0）のみ。</li>
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
            """)
    Slice<Post> search(@Param("cohortId") Long cohortId,
                       @Param("q") String q,
                       @Param("aspects") Collection<ReviewAspect> aspects,
                       @Param("tones") Collection<ReviewTone> tones,
                       @Param("status") RecruitStatus status,
                       @Param("unreviewedOnly") boolean unreviewedOnly,
                       Pageable pageable);
}
