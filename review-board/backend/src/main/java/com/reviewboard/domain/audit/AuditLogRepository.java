package com.reviewboard.domain.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /** 閲覧（★S軸）：自 cohort の監査ログのみ・新しい順。他 cohort は返さない。 */
    Page<AuditLog> findByCohortIdOrderByCreatedAtDesc(Long cohortId, Pageable pageable);
}
