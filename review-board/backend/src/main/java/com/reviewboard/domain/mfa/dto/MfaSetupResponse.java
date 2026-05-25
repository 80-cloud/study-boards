package com.reviewboard.domain.mfa.dto;

/**
 * TOTP セットアップ応答。QR（data URI）・手入力用シークレット・otpauth URI を返す（setup 応答でのみ）。
 * otpauthUri はカメラの無いユーザーが対応アプリへ貼り付けで取り込むための導線（#237）。
 */
public record MfaSetupResponse(String secret, String qrDataUri, String otpauthUri) {
}
