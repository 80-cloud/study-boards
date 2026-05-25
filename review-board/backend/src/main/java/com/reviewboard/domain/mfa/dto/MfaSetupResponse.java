package com.reviewboard.domain.mfa.dto;

/**
 * TOTP セットアップ応答。QR（data URI）のみを返す。
 * 生シークレットは API では返さない（QR に内包・取り込みは QR スキャン一本化。#239）。
 */
public record MfaSetupResponse(String qrDataUri) {
}
