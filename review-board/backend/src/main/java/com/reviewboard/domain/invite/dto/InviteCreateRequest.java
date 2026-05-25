package com.reviewboard.domain.invite.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 招待コード発行リクエスト（講師/管理者・Issue #165）。
 * いずれも任意。未指定なら maxUses=30・有効 7 日（実運用の 1 期分を想定した既定）。
 */
public record InviteCreateRequest(
        @Min(1) @Max(500) Integer maxUses,
        @Min(1) @Max(90) Integer expiresInDays) {

    public int maxUsesOrDefault() {
        return maxUses != null ? maxUses : 30;
    }

    public int expiresInDaysOrDefault() {
        return expiresInDays != null ? expiresInDays : 7;
    }
}
