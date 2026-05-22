package com.reviewboard.domain.audit;

import com.reviewboard.domain.auth.AuthPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 監査ログの記録と閲覧（★S軸・要件 §4-1）。
 *
 * <p>記録は呼び出し元の {@code @Transactional} に参加する（{@code MANDATORY}）。これにより
 * 「操作がコミットされたときだけ監査行も残る」を保証し、ログだけ残る/操作だけ残るを防ぐ。
 * actor・cohort は principal（検証済み JWT）から導出し、クライアント入力を信用しない。
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /** 監査行を記録する。認可チェックを通過した操作の後で呼ぶこと。 */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void record(AuthPrincipal actor, AuditAction action, AuditTargetType targetType, Long targetId) {
        AuditLog log = new AuditLog();
        log.setActorUserId(actor.userId());
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setCohortId(actor.cohortId());
        log.setCreatedAt(OffsetDateTime.now());
        repository.save(log);
    }

    /** 閲覧（講師限定は Controller の @PreAuthorize で担保）。自 cohort のログのみ。 */
    @Transactional(readOnly = true)
    public Page<AuditLog> listForCohort(AuthPrincipal principal, Pageable pageable) {
        return repository.findByCohortIdOrderByCreatedAtDesc(principal.cohortId(), pageable);
    }
}
