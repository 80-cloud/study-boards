package com.reviewboard.domain.evaluation;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 講師の最終評価・承認（F-EVAL-01・★S軸の重点検証対象）。
 * 1 投稿に履歴行を積み、最新だけ is_latest=true（母 S-4 履歴保持）。
 * 書き込みは講師ロール限定（サービス層 + @PreAuthorize で担保）。
 */
@Entity
@Table(name = "evaluations")
@Getter
@Setter
@NoArgsConstructor
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "teacher_user_id", nullable = false)
    private Long teacherUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EvaluationResult result;

    @Column(nullable = false, columnDefinition = "text")
    private String comment;

    @Column(name = "is_latest", nullable = false)
    private boolean latest = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
