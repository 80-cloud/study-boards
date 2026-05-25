package com.reviewboard.domain.passwordreset;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * パスワードリセットトークン（Issue #231・B-4）。
 * 平文は保存せず SHA-256 ハッシュを保持し、1 度きりで使い捨て（used_at で消費・expires_at で失効）。
 */
@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    /** 消費済みの時刻。null＝未使用。1 度きりのため confirm 成功時に立てる。 */
    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
