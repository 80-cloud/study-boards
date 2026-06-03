package com.reviewboard.domain.invite;

import com.reviewboard.domain.user.UserRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * cohort 招待コード（F-AUTH-02 / Issue #165）。講師・管理者が発行し、受講生が登録に使う。
 * 生コードは保存せず SHA-256 hex のみ保持（refresh token と同方針）。
 * 失効判定は {@link #isUsable(OffsetDateTime)}（revoked / expired / max_uses 到達）。
 */
@Entity
@Table(name = "cohort_invites")
@Getter
@Setter
@NoArgsConstructor
public class CohortInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cohort_id", nullable = false)
    private Long cohortId;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    /**
     * #563：生コードの at-rest 暗号化値（{@code v1:...}・{@link com.reviewboard.domain.mfa.SecretCipher}）。
     * 講師/管理者の一覧で復号して招待リンクを再表示するために保持する。平文は保存しない。
     * 鍵未設定の環境や V25 より前に発行した招待では null（その場合は再表示不可＝従来挙動）。
     */
    @Column(name = "code_encrypted")
    private String codeEncrypted;

    /** 発行者（退会時は DB 側で SET NULL）。 */
    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "max_uses", nullable = false)
    private int maxUses;

    @Column(name = "current_uses", nullable = false)
    private int currentUses;

    /** #511：招待で作成するユーザーのロール。既定 STUDENT、TEACHER は ADMIN のみ発行可。 */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 10)
    private UserRole targetRole = UserRole.STUDENT;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    /** 今この招待で登録できるか（未失効・未期限切れ・使用回数に余裕あり）。 */
    public boolean isUsable(OffsetDateTime now) {
        return revokedAt == null && expiresAt.isAfter(now) && currentUses < maxUses;
    }
}
