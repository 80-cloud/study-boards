package com.reviewboard.domain.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * JWT リフレッシュトークンの DB rotation（共通設計方針）。
 * 平文は保存せず SHA-256 ハッシュを保持。refresh ごとに使い捨て rotation（revoked_at で失効）。
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
