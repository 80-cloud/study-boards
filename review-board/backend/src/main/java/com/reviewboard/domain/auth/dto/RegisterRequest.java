package com.reviewboard.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 招待コードによる受講生の自己登録リクエスト（F-AUTH-02 / Issue #165・公開エンドポイント）。
 * code で cohort と発行枠を解決する。role は常に STUDENT（公開サインアップで講師/管理者は作らせない）。
 */
public record RegisterRequest(
        @NotBlank String code,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 50) String displayName,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
