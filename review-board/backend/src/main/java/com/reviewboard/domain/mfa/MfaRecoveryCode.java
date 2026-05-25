package com.reviewboard.domain.mfa;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * MFA リカバリコード（Issue #241）。認証アプリ／端末紛失時の自己復旧手段。
 *
 * <p>生コードは保存せず SHA-256 ハッシュのみ保持（refresh / invite / password-reset と同方針）。
 * 1 度きりの使い捨て：ログイン2段目で一致したら {@code usedAt} を立てて以後拒否する。
 */
@Entity
@Table(name = "mfa_recovery_codes")
@Getter
@Setter
@NoArgsConstructor
public class MfaRecoveryCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
