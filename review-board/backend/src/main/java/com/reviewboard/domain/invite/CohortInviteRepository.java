package com.reviewboard.domain.invite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface CohortInviteRepository extends JpaRepository<CohortInvite, Long> {

    /** 登録時の検証は raw 比較ではなく hash の UNIQUE lookup で行う（timing 比較なし）。 */
    Optional<CohortInvite> findByCodeHash(String codeHash);

    /** 講師/管理者の招待一覧（自 cohort・新しい順）。 */
    List<CohortInvite> findByCohortIdOrderByCreatedAtDesc(Long cohortId);

    /**
     * 使用回数を原子的に +1（未失効・未期限切れ・枠あり が WHERE 条件）。
     * 返り値 1=消費成功 / 0=利用不可（同時登録で maxUses を超えない・S軸の競合対策）。
     */
    @Modifying
    @Query("update CohortInvite c set c.currentUses = c.currentUses + 1 "
            + "where c.id = :id and c.revokedAt is null and c.expiresAt > :now and c.currentUses < c.maxUses")
    int tryConsume(@Param("id") Long id, @Param("now") OffsetDateTime now);
}
