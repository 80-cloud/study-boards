package com.reviewboard.domain.auth.dto;

import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;

/** 認証後にフロントへ返す最小ユーザー情報（パスワード等は含めない）。avatarUrl は短命署名URL（null可）。 */
public record UserResponse(Long id, String displayName, UserRole role, Long cohortId, String avatarUrl,
                           boolean mfaEnabled) {

    public static UserResponse from(User user, String avatarUrl) {
        return new UserResponse(user.getId(), user.getDisplayName(), user.getRole(), user.getCohortId(), avatarUrl,
                user.isMfaEnabled());
    }
}
