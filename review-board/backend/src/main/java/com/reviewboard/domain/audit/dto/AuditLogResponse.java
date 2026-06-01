package com.reviewboard.domain.audit.dto;

import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditLog;
import com.reviewboard.domain.audit.AuditTargetType;

import java.time.OffsetDateTime;

/**
 * 監査ログの閲覧レスポンス（★セキュリティ）。誰が(actorUserId)・いつ(createdAt)・
 * 誰の資源に(targetType/targetId)・何を(action)。
 */
public record AuditLogResponse(
        Long id,
        Long actorUserId,
        AuditAction action,
        AuditTargetType targetType,
        Long targetId,
        OffsetDateTime createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getActorUserId(), log.getAction(),
                log.getTargetType(), log.getTargetId(), log.getCreatedAt());
    }
}
