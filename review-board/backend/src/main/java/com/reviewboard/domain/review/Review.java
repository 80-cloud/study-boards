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

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
