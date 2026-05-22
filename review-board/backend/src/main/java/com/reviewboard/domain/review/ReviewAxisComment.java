package com.reviewboard.domain.review;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * レビューの観点別コメント（F-REV-01・任意）。1 レビューにつき 1 軸 1 行（ER図 uq_review_axis）。
 */
@Entity
@Table(name = "review_axis_comments")
@Getter
@Setter
@NoArgsConstructor
public class ReviewAxisComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewAxis axis;

    @Column(nullable = false, columnDefinition = "text")
    private String comment;
}
