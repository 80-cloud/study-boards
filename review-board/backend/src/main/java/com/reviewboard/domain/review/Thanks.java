package com.reviewboard.domain.review;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * ありがとう（F-REV-03）。1 レビューに 1 ユーザー 1 回（ER図 uq_thanks で冪等を担保）。
 */
@Entity
@Table(name = "thanks")
@Getter
@Setter
@NoArgsConstructor
public class Thanks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "from_user_id", nullable = false)
    private Long fromUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
