package com.reviewboard.domain.auth.dto;

/** ログイン1段目の応答：MFA が必要でまだセッションを発行していないことを示す。 */
public record MfaRequiredResponse(boolean mfaRequired) {

    public static MfaRequiredResponse required() {
        return new MfaRequiredResponse(true);
    }
}
