package com.reviewboard.domain.audit.dto;

import com.reviewboard.domain.audit.AuditService;

/**
 * 監査ログ連鎖の検証結果（#247）。{@code valid=false} のとき {@code firstBrokenId} に
 * 最初に整合が破れた行 ID が入る（改ざん検知）。{@code count} は検証対象（連鎖済み）行数。
 */
public record AuditChainVerifyResponse(boolean valid, long count, Long firstBrokenId) {

    public static AuditChainVerifyResponse from(AuditService.ChainVerification v) {
        return new AuditChainVerifyResponse(v.valid(), v.count(), v.firstBrokenId());
    }
}
