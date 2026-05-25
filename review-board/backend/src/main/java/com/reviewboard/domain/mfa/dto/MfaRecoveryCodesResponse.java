package com.reviewboard.domain.mfa.dto;

import java.util.List;

/**
 * リカバリコード発行応答（#241）。MFA 有効化時・再生成時に生コードを1度だけ返す。
 * 生コードはこのレスポンス以降は二度と取得できない（DB はハッシュのみ）。
 */
public record MfaRecoveryCodesResponse(List<String> recoveryCodes) {
}
