package com.reviewboard.domain.passwordreset.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** パスワードリセット要求（email を受け取り、存在を漏らさず常に 200 を返す）。 */
public record PasswordResetRequestRequest(
        @NotBlank @Email String email) {
}
