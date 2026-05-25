package com.reviewboard.domain.audit;

/**
 * 監査対象の資源種別（★S軸）。「誰の資源に」の資源の型。
 * 名前は audit_logs.target_type(VARCHAR(30)) に格納する。
 */
public enum AuditTargetType {
    POST,
    REVIEW,
    EVALUATION,
    USER
}
