package com.reviewboard.domain.audit;

import com.reviewboard.domain.auth.AuthPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 監査ログの記録と閲覧（★セキュリティ・要件 §4-1）。
 *
 * <p>記録は呼び出し元の {@code @Transactional} に参加する（{@code MANDATORY}）。これにより
 * 「操作がコミットされたときだけ監査行も残る」を保証し、ログだけ残る/操作だけ残るを防ぐ。
 * actor・cohort は principal（検証済み JWT）から導出し、クライアント入力を信用しない。
 *
 * <p>改ざん防止（#247）：cohort 単位のハッシュ連鎖で記録する。記録 TX 内で advisory lock を取り
 * 直前行を確定させてから entry_hash を計算するため、並行記録でも連鎖が分岐しない。
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /** 監査行を記録する。認可チェックを通過した操作の後で呼ぶこと。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AuthPrincipal actor, AuditAction action, AuditTargetType targetType, Long targetId) {
        // #247 連鎖の single-writer 化：同 cohort の記録を直列化（TX 終了で自動解放）。
        repository.acquireCohortChainLock(actor.cohortId());

        AuditLog log = new AuditLog();
        log.setActorUserId(actor.userId());
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setCohortId(actor.cohortId());
        log.setCreatedAt(OffsetDateTime.now());

        // 直前行（同 cohort の連鎖済み最新行）の entry_hash を prev_hash に結ぶ。
        String prevHash = repository.findTopByCohortIdOrderByIdDesc(actor.cohortId())
                .map(AuditLog::getEntryHash)
                .orElse(null); // cohort の genesis
        log.setPrevHash(prevHash);
        log.setEntryHash(AuditHasher.entryHash(prevHash, log));
        repository.save(log);
    }

    /** 閲覧（講師限定は Controller の @PreAuthorize で担保）。自 cohort のログのみ。 */
    @Transactional(readOnly = true)
    public Page<AuditLog> listForCohort(AuthPrincipal principal, Pageable pageable) {
        return repository.findByCohortIdOrderByCreatedAtDesc(principal.cohortId(), pageable);
    }

    /**
     * 連鎖の整合検証（#247・講師限定は Controller で担保）。自 cohort の連鎖済み行を記録順に
     * 再計算し、prev_hash のリンクと entry_hash の再現を確認する。最初に破れた行 ID を返す。
     */
    @Transactional(readOnly = true)
    public ChainVerification verifyChain(AuthPrincipal principal) {
        List<AuditLog> chain = repository.findByCohortIdAndEntryHashIsNotNullOrderByIdAsc(principal.cohortId());
        String expectedPrev = null; // genesis は null
        for (AuditLog log : chain) {
            // prev リンクの一致と entry_hash の再現の両方を確認する。
            boolean linkOk = java.util.Objects.equals(expectedPrev, log.getPrevHash());
            boolean hashOk = AuditHasher.entryHash(log.getPrevHash(), log).equals(log.getEntryHash());
            if (!linkOk || !hashOk) {
                return new ChainVerification(false, chain.size(), log.getId());
            }
            expectedPrev = log.getEntryHash();
        }
        return new ChainVerification(true, chain.size(), null);
    }

    /** 連鎖検証の結果。{@code valid=false} のとき {@code firstBrokenId} に最初の破れ行 ID。 */
    public record ChainVerification(boolean valid, long count, Long firstBrokenId) {
    }
}
