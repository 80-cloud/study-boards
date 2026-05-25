package com.reviewboard.domain.mfa.dto;

/** TOTP セットアップ応答。QR（data URI）と、手入力用のシークレット。setup 応答でのみ返す。 */
public record MfaSetupResponse(String secret, String qrDataUri) {
}
