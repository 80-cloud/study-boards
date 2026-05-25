package com.reviewboard.domain.passwordreset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** パスワードリセット確定（メールで受け取ったトークン + 新パスワード）。 */
public record PasswordResetConfirmRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
