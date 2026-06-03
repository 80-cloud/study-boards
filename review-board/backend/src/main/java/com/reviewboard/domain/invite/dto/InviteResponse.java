package com.reviewboard.domain.invite.dto;

import com.reviewboard.domain.invite.CohortInvite;
import com.reviewboard.domain.user.UserRole;

import java.time.OffsetDateTime;

/**
 * 招待レスポンス（Issue #165 / #511）。
 * {@code rawCode} は発行直後の 1 度だけ値が入り（受講生に渡す元データ）、一覧では常に null。
 * {@code targetRole} は招待で作成されるユーザーのロール（STUDENT または TEACHER）。
 * {@code status} は ACTIVE / EXPIRED / USED_UP / REVOKED を読み側で算出。
 */
public record InviteResponse(
        Long id,
        Long cohortId,
        String rawCode,
        int maxUses,
        int currentUses,
        UserRole targetRole,
        OffsetDateTime expiresAt,
        OffsetDateTime revokedAt,
        OffsetDateTime createdAt,
        String status) {

    /** 一覧用（rawCode は保持していないので null）。 */
    public static InviteResponse of(CohortInvite inv, OffsetDateTime now) {
        return new InviteResponse(inv.getId(), inv.getCohortId(), null,
                inv.getMaxUses(), inv.getCurrentUses(), inv.getTargetRole(),
                inv.getExpiresAt(), inv.getRevokedAt(),
                inv.getCreatedAt(), status(inv, now));
    }

    /** 発行直後用（生コードを 1 度だけ返す）。 */
    public static InviteResponse withRawCode(CohortInvite inv, String rawCode, OffsetDateTime now) {
        return new InviteResponse(inv.getId(), inv.getCohortId(), rawCode,
                inv.getMaxUses(), inv.getCurrentUses(), inv.getTargetRole(),
                inv.getExpiresAt(), inv.getRevokedAt(),
                inv.getCreatedAt(), status(inv, now));
    }

    private static String status(CohortInvite inv, OffsetDateTime now) {
        if (inv.getRevokedAt() != null) return "REVOKED";
        if (!inv.getExpiresAt().isAfter(now)) return "EXPIRED";
        if (inv.getCurrentUses() >= inv.getMaxUses()) return "USED_UP";
        return "ACTIVE";
    }
}
