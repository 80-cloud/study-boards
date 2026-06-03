package com.reviewboard.domain.invite.dto;

import com.reviewboard.domain.invite.CohortInvite;
import com.reviewboard.domain.user.UserRole;

import java.time.OffsetDateTime;

/**
 * 招待レスポンス（Issue #165 / #511 / #563）。
 * {@code rawCode} は招待リンクの元データ。発行直後に加え、講師/管理者の一覧でも
 * 復号して再表示する（#563）。暗号文を持たない招待（鍵未設定 / V25 以前）では null。
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

    /** 発行直後・一覧の再表示用（生コードを伴う。暗号文が無ければ rawCode=null）。 */
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
