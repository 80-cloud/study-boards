package com.reviewboard.domain.user.dto;

import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;
import com.reviewboard.domain.user.UserStatus;

/**
 * メンバー管理（#229）の一覧行。講師/管理者が cohort のメンバーと有効状態を確認するための最小情報。
 */
public record MemberResponse(
        Long id,
        String displayName,
        String email,
        UserRole role,
        UserStatus status) {

    public static MemberResponse from(User u) {
        return new MemberResponse(u.getId(), u.getDisplayName(), u.getEmail(), u.getRole(), u.getStatus());
    }
}
