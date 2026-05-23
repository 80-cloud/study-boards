package com.reviewboard.domain.review;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * レビュー（F-REV-01）。良かった点・改善提案は必須。観点別コメントは別テーブル（任意）。
 * 自己レビュー禁止・他 cohort 不可はサービス層で検証。
 */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "reviewer_user_id", nullable = false)
    private Long reviewerUserId;

    @Column(nullable = false, columnDefinition = "text")
    private String good;

    @Column(nullable = false, columnDefinition = "text")
    private String improvement;

    @Column(name = "thanks_count", nullable = false)
    private int thanksCount = 0;

    /** F-REV-04 返信数（非正規化・同一 TX 更新）。 */
    @Column(name = "replies_count", nullable = false)
    private int repliesCount = 0;

    /** F-GROW-01 対応状態（投稿者本人が設定・既定は未対応）。 */
    @Enumerated(EnumType.STRING)
    @Column(name = "growth_status", nullable = false, length = 30)
    private GrowthStatus growthStatus = GrowthStatus.OPEN;

    /** F-GROW-01 Before-After メモ（投稿者の自由記述・任意）。 */
    @Column(name = "before_after", columnDefinition = "text")
    private String beforeAfter;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
