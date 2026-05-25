package com.reviewboard.domain.audit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * 監査ログのハッシュ連鎖の計算（#247）。記録時と検証時で **同一の正規化** を使うことが要。
 *
 * <p>entry_hash = SHA256( prev_hash + "|" + 正規化レコード )。prev_hash が null（genesis）は空文字で扱う。
 * createdAt は epoch millis で正規化する（DB は TIMESTAMPTZ で micros 保存・Java は nanos のため、
 * 書き込み時と再読込時で差が出ないよう millis に丸める）。
 */
final class AuditHasher {

    private AuditHasher() {
    }

    /** 連鎖計算用の正規化レコード（区切りはパイプ・各フィールドは決定的な文字列表現）。 */
    static String canonical(AuditLog log) {
        return String.join("|",
                String.valueOf(log.getActorUserId()),
                log.getAction().name(),
                log.getTargetType().name(),
                String.valueOf(log.getTargetId()),
                String.valueOf(log.getCohortId()),
                String.valueOf(log.getCreatedAt().toInstant().toEpochMilli()));
    }

    /** entry_hash = SHA256(prevHash + "|" + canonical)。prevHash null は "" 扱い。 */
    static String entryHash(String prevHash, AuditLog log) {
        String material = (prevHash == null ? "" : prevHash) + "|" + canonical(log);
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash); // 64 文字 hex（audit_logs.entry_hash CHAR(64)）
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
