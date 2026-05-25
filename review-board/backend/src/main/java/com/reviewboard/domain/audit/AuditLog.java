package com.reviewboard.domain.audit;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 監査ログ（★S軸・要件 §4-1）。「誰が(actor)・いつ(createdAt)・誰の資源に(targetType/targetId)・
 * 何を(action)」を追跡する。cohort_id を持ち、閲覧の cohort 境界に使う。
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 30)
    private AuditTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "cohort_id", nullable = false)
    private Long cohortId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /** 改ざん防止の連鎖（#247）：同 cohort の直前行の entry_hash。genesis は null。 */
    @Column(name = "prev_hash", length = 64)
    private String prevHash;

    /** この行のハッシュ = SHA256(prev_hash + 正規化レコード)。V19 以降の新規行のみ持つ。 */
    @Column(name = "entry_hash", length = 64)
    private String entryHash;
}
