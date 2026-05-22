package com.reviewboard.domain.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * ユーザー（RBAC の主体）。role と cohort_id を最初から持つ（後付け回避・R-04）。
 * 成長記録ページ（F-PROF）の表示用に非正規化カウンタを保持（ER図 §5）。
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UserRole role;

    /** 全認可の起点（cohort 境界） */
    @Column(name = "cohort_id", nullable = false)
    private Long cohortId;

    @Column(length = 500)
    private String bio;

    // --- 非正規化カウンタ（書き込みと同一Txで増減 + 定期再計算で補正。母 S-3） ---
    @Column(name = "received_reviews_count", nullable = false)
    private int receivedReviewsCount = 0;

    @Column(name = "given_reviews_count", nullable = false)
    private int givenReviewsCount = 0;

    @Column(name = "thanks_received_count", nullable = false)
    private int thanksReceivedCount = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
