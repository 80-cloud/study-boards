package com.reviewboard.domain.mfa.dto;

import jakarta.validation.constraints.NotBlank;

/** TOTP コードの検証リクエスト（enable / disable / login/mfa 共通）。 */
public record MfaCodeRequest(
        @NotBlank String code) {
}
