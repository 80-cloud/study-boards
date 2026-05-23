package com.reviewboard.domain.audit;

/**
 * 監査対象のアクション（★S軸・要件 §4-1）。「誰が・何をしたか」の「何を」。
 * 名前は audit_logs.action(VARCHAR(50)) に格納する。
 */
public enum AuditAction {
    POST_CREATED,
    POST_UPDATED,
    POST_DELETED,
    REVIEW_CREATED,
    REVIEW_DELETED,
    THANKS_SENT,
    REVIEW_GROWTH_UPDATED,
    EVALUATION_APPROVED,
    EVALUATION_RETURNED
}
