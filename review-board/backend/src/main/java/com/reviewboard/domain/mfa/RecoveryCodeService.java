package com.reviewboard.domain.mfa;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * MFA リカバリコードの生成・保存・消費・再生成（Issue #241）。
 *
 * <p>生コードは {@code xxxx-xxxx} 形式（Crockford Base32・紛らわしい文字を除外）。
 * 保存は SHA-256 hex のみ（refresh / invite / password-reset と同方針）。
 * 1 度きりの使い捨て：{@link #consume} で一致したら used_at を立て、再利用は弾く。
 */
@Service
public class RecoveryCodeService {

    /** 1 ユーザーあたりの発行数。 */
    static final int CODE_COUNT = 10;
    /** 残数がこれ以下なら UI で警告（フロントが remaining と合わせて判断）。 */
    public static final int LOW_REMAINING_THRESHOLD = 3;

    /** 紛らわしい文字（0/O/1/I/L）を除いた英数字（Crockford Base32 系）。 */
    private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    private static final int GROUP_LEN = 4; // xxxx-xxxx

    private final MfaRecoveryCodeRepository repository;
    private final SecureRandom random = new SecureRandom();

    public RecoveryCodeService(MfaRecoveryCodeRepository repository) {
        this.repository = repository;
    }

    /**
     * 当該ユーザーのリカバリコードを作り直す（既存は全削除→新規 {@value #CODE_COUNT} 個）。
     * MFA 有効化時・再生成時の両方から呼ぶ。
     *
     * @return 生コード（呼び出し元が1度だけユーザーに見せる。DB にはハッシュのみ残る）
     */
    @Transactional
    public List<String> regenerate(Long userId) {
        repository.deleteAllByUserId(userId);
        OffsetDateTime now = OffsetDateTime.now();
        List<String> rawCodes = new ArrayList<>(CODE_COUNT);
        for (int i = 0; i < CODE_COUNT; i++) {
            String raw = randomCode();
            rawCodes.add(raw);
            MfaRecoveryCode entity = new MfaRecoveryCode();
            entity.setUserId(userId);
            entity.setCodeHash(sha256(normalize(raw)));
            entity.setCreatedAt(now);
            repository.save(entity);
        }
        return rawCodes;
    }

    /**
     * 入力コードが当該ユーザーの未使用リカバリコードと一致すれば消費して true。
     * 不一致・使用済み・他人のコードは false（ログイン2段目で TOTP 失敗後に呼ぶ）。
     */
    @Transactional
    public boolean consume(Long userId, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return false;
        }
        Optional<MfaRecoveryCode> found = repository.findByCodeHash(sha256(normalize(rawCode)));
        if (found.isEmpty()) {
            return false;
        }
        MfaRecoveryCode code = found.get();
        // 他人のコードのハッシュ衝突（事実上ありえないが）・使用済みは拒否。
        if (!code.getUserId().equals(userId) || code.getUsedAt() != null) {
            return false;
        }
        code.setUsedAt(OffsetDateTime.now());
        return true;
    }

    /** 残りの未使用コード数。 */
    public long remaining(Long userId) {
        return repository.countByUserIdAndUsedAtIsNull(userId);
    }

    /** 当該ユーザーの全リカバリコードを削除（MFA 無効化時）。 */
    @Transactional
    public void deleteAll(Long userId) {
        repository.deleteAllByUserId(userId);
    }

    /** {@code xxxx-xxxx} 形式の生コードを1つ作る。 */
    private String randomCode() {
        StringBuilder sb = new StringBuilder(GROUP_LEN * 2 + 1);
        for (int i = 0; i < GROUP_LEN * 2; i++) {
            if (i == GROUP_LEN) {
                sb.append('-');
            }
            sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }

    /** 照合の正規化：大文字化＋区切り/空白除去（ユーザーの入力ゆらぎを吸収）。 */
    private String normalize(String raw) {
        return raw.trim().toUpperCase().replace("-", "").replaceAll("\\s", "");
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash); // 64 文字 hex（mfa_recovery_codes.code_hash CHAR(64)）
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
