package com.reviewboard.domain.admin.dto;

import com.reviewboard.domain.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * アカウント発行リクエスト（ADMIN のみ）。
 * パスワードは初期発行用。bcrypt の上限に合わせ最大 72 文字。
 */
public record AdminUserCreateRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 50) String displayName,
        @NotNull UserRole role,
        @NotNull Long cohortId,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
