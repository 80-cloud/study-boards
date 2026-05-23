package com.reviewboard.domain.admin.dto;

import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRole;

/** 発行されたアカウントの応答（パスワードは返さない）。 */
public record AdminUserResponse(Long id, String email, String displayName, UserRole role, Long cohortId) {

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getDisplayName(),
                user.getRole(), user.getCohortId());
    }
}
