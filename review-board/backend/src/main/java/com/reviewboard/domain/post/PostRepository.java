package com.reviewboard.domain.post;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    /** 一覧（F-POST-03）：同 cohort かつ未削除のみ。cohort 境界で IDOR を遮断（ER図 §9） */
    Slice<Post> findByCohortIdAndDeletedAtIsNull(Long cohortId, Pageable pageable);

    /** 単体取得も cohort 境界で絞る（他 cohort は不可視＝404 に倒す） */
    Optional<Post> findByIdAndCohortIdAndDeletedAtIsNull(Long id, Long cohortId);
}
