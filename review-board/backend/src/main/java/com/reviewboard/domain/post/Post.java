package com.reviewboard.domain.post;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 成果物（F-POST）。cohort_id を冗長保持し、一覧の cohort 境界を単純化（ER図 §3-2）。
 * 論理削除（deleted_at）で履歴・参照整合性を保つ（母 S-4）。
 */
@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    /** author の cohort を冗長コピー（一覧 IDOR 境界） */
    @Column(name = "cohort_id", nullable = false)
    private Long cohortId;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "repo_url", length = 512)
    private String repoUrl;

    @Column(name = "demo_url", length = 512)
    private String demoUrl;

    /** S3（ローカル MinIO）オブジェクトキー。本体は DB に置かない（母 P-10） */
    @Column(name = "screenshot_key", length = 512)
    private String screenshotKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "recruit_status", nullable = false, length = 10)
    private RecruitStatus recruitStatus = RecruitStatus.OPEN;

    @Column(name = "review_count", nullable = false)
    private int reviewCount = 0;

    /** いいね数（非正規化カウンタ。いいね/解除と同一Txで増減）。ランキング基準。 */
    @Column(name = "like_count", nullable = false)
    private int likeCount = 0;

    /** F-REV-05 ベストレビュー：投稿者が選んだ最も役立ったレビューの ID（未選択は null）。 */
    @Column(name = "best_review_id")
    private Long bestReviewId;

    /**
     * F-SAFE-01 心理的安全設定：投稿者が歓迎するレビューのトーン（多値・未設定は空）。
     * 観点と同じく正規化テーブルで保持。EAGER ＋ BatchSize で一覧の N+1 を束ねる。
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "post_review_tones", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "tone", length = 20)
    @Enumerated(EnumType.STRING)
    @BatchSize(size = 50)
    private Set<ReviewTone> reviewTones = new LinkedHashSet<>();

    /** AI使用状況の開示タグ（単一・未設定は null・Issue #172）。 */
    @Enumerated(EnumType.STRING)
    @Column(name = "ai_usage", length = 20)
    private AiUsage aiUsage;

    /**
     * F-REQ-01 観点別レビュー依頼：募集したい観点（多値）。投稿削除で子行も自動削除。
     * EAGER ＋ BatchSize で詳細取得時の遅延初期化を避けつつ一覧の N+1 を1クエリに束ねる。
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "post_review_aspects", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "aspect", length = 20)
    @Enumerated(EnumType.STRING)
    @BatchSize(size = 50)
    private Set<ReviewAspect> reviewAspects = new LinkedHashSet<>();

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
