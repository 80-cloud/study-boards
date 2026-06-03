package com.reviewboard.domain.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /** 閲覧（★セキュリティ）：自 cohort の監査ログのみ・新しい順。他 cohort は返さない。 */
    Page<AuditLog> findByCohortIdOrderByCreatedAtDesc(Long cohortId, Pageable pageable);

    /** 連鎖の直前行（#247）：同 cohort で最新（id 最大）の行。genesis 判定に使う。 */
    Optional<AuditLog> findTopByCohortIdOrderByIdDesc(Long cohortId);

    /** 検証（#247）：同 cohort の連鎖済み行（entry_hash あり）を記録順（id 昇順）で。 */
    List<AuditLog> findByCohortIdAndEntryHashIsNotNullOrderByIdAsc(Long cohortId);

    /**
     * 連鎖の single-writer 化（#247）：記録 TX 内で cohort をキーに排他ロックを取る。
     * TX 終了時に自動解放。並行記録時の prev_hash 競合（連鎖の分岐）を防ぐ。
     *
     * <p>{@code pg_advisory_xact_lock} は void を返すため、{@code ::text}（空文字）にキャストして
     * 結果セットを1行返す（戻り値は使わない＝ロック取得が目的）。
     */
    @Query(value = "SELECT cast(pg_advisory_xact_lock(:key) as text)", nativeQuery = true)
    String acquireCohortChainLock(@Param("key") long key);
}
