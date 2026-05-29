package com.reviewboard.domain.invite.dto;

import com.reviewboard.domain.user.UserRole;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 招待コード発行リクエスト（講師/管理者・Issue #165 / #511）。
 * いずれも任意。未指定なら maxUses=30・有効 7 日・targetRole=STUDENT（実運用の 1 期分の既定）。
 * targetRole=TEACHER は Controller 側で ADMIN ロール限定（権限昇格防止）。
 */
public record InviteCreateRequest(
        @Min(1) @Max(500) Integer maxUses,
        @Min(1) @Max(90) Integer expiresInDays,
        UserRole targetRole) {

    public int maxUsesOrDefault() {
        return maxUses != null ? maxUses : 30;
    }

    public int expiresInDaysOrDefault() {
        return expiresInDays != null ? expiresInDays : 7;
    }

    public UserRole targetRoleOrDefault() {
        return targetRole != null ? targetRole : UserRole.STUDENT;
    }
}
