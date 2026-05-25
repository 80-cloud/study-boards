package com.reviewboard.domain.post;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditService;
import com.reviewboard.domain.audit.AuditTargetType;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.dto.PostCreateRequest;
import com.reviewboard.domain.post.dto.PostUpdateRequest;
import java.util.Set;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * 投稿のユースケース（F-POST）。★S軸の中核：cohort 境界と所有者を必ずバックエンドで検証する。
 *
 * <p>取得・一覧は principal.cohortId で絞り、編集・削除は所有者（authorUserId == userId）に限定する。
 * 境界外・他人・削除済みは存在を漏らさず {@link ResourceNotFoundException}（404）に倒す（IDOR 遮断）。
 */
@Service
public class PostService {

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final AuditService auditService;
    private final com.reviewboard.domain.notification.NotificationService notificationService;
    private final org.springframework.context.ApplicationEventPublisher events;

    public PostService(PostRepository postRepository, ReviewRepository reviewRepository,
                       AuditService auditService,
                       com.reviewboard.domain.notification.NotificationService notificationService,
                       org.springframework.context.ApplicationEventPublisher events) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.events = events;
    }

    /**
     * #218 自動サムネ：demo_url があり手動スクショが無い投稿は、保存コミット後に撮影を要求する
     * （AFTER_COMMIT・@Async で実行）。フラグ OFF（本番既定）なら listener 側で no-op。
     */
    private void requestAutoThumbnail(Post post) {
        boolean hasManual = post.getScreenshotKey() != null && !post.getScreenshotKey().isBlank();
        boolean hasDemo = post.getDemoUrl() != null && !post.getDemoUrl().isBlank();
        if (hasDemo && !hasManual) {
            events.publishEvent(new com.reviewboard.thumbnail.PostThumbnailRequested(
                    post.getId(), post.getCohortId(), post.getDemoUrl()));
        }
    }

    /** F-POST-01 作成。cohort と author は principal（検証済み）から導出する。 */
    @Transactional
    public Post create(AuthPrincipal principal, PostCreateRequest req) {
        OffsetDateTime now = OffsetDateTime.now();
        Post post = new Post();
        post.setAuthorUserId(principal.userId());
        post.setCohortId(principal.cohortId());
        post.setTitle(req.title());
        post.setDescription(req.description());
        post.setRepoUrl(req.repoUrl());
        post.setDemoUrl(req.demoUrl());
        post.setScreenshotKey(req.screenshotKey());
        post.setRecruitStatus(RecruitStatus.OPEN);
        applyReviewPreferences(post, req.reviewTones(), req.reviewAspects(), req.aiUsage());
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postRepository.save(post);
        auditService.record(principal, AuditAction.POST_CREATED, AuditTargetType.POST, post.getId());
        requestAutoThumbnail(post);
        return post;
    }

    /** F-POST-03 単体取得。自 cohort かつ未削除のみ可視（他は 404）。 */
    @Transactional(readOnly = true)
    public Post get(AuthPrincipal principal, Long postId) {
        return postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
    }

    /**
     * F-POST-03 一覧 ＋ F-SEARCH-01 検索 ＋ F-FILTER-01 絞り込み/並び替え。
     * 自 cohort・未削除のみ（IDOR 遮断は Repository クエリで常時担保）。ページネーション（母 P-2）。
     *
     * @param q             キーワード（タイトル/説明の部分一致。空/ null は無視）
     * @param aspects       キーワードから解決した観点（タグ一致でヒット。null/空は無視）
     * @param tones         キーワードから解決したトーン（タグ一致でヒット。null/空は無視）
     * @param status        募集状態フィルタ（null は無視）
     * @param unreviewedOnly 未レビュー（review_count=0）のみに絞る
     * @param approvedOnly  最新評価が「合格」の投稿のみに絞る（合格バッジ一覧・#210）
     * @param sort          並び順："reviews"（レビュー数降順）／それ以外は新着降順
     */
    @Transactional(readOnly = true)
    public Slice<Post> search(AuthPrincipal principal, String q,
                              java.util.Collection<ReviewAspect> aspects,
                              java.util.Collection<ReviewTone> tones,
                              RecruitStatus status,
                              boolean unreviewedOnly, boolean approvedOnly,
                              String sort, Pageable pageable) {
        String keyword = (q == null || q.isBlank()) ? null : q.trim();
        // 空集合は IN 句が常に偽になり「一致なし」として扱われる（Hibernate 6）。
        java.util.Collection<ReviewAspect> asp = aspects == null ? java.util.List.of() : aspects;
        java.util.Collection<ReviewTone> tn = tones == null ? java.util.List.of() : tones;
        Sort order = switch (sort == null ? "" : sort) {
            case "reviews" -> Sort.by(Sort.Direction.DESC, "reviewCount").and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case "likes" -> Sort.by(Sort.Direction.DESC, "likeCount").and(Sort.by(Sort.Direction.DESC, "createdAt"));
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), order);
        return postRepository.search(principal.cohortId(), keyword, asp, tn, status,
                unreviewedOnly, approvedOnly, sorted);
    }

    /** F-POST-02 編集。所有者のみ（不一致・他 cohort・削除済みは 404）。 */
    @Transactional
    public Post update(AuthPrincipal principal, Long postId, PostUpdateRequest req) {
        Post post = loadOwned(principal, postId);
        post.setTitle(req.title());
        post.setDescription(req.description());
        post.setRepoUrl(req.repoUrl());
        post.setDemoUrl(req.demoUrl());
        post.setScreenshotKey(req.screenshotKey());
        applyReviewPreferences(post, req.reviewTones(), req.reviewAspects(), req.aiUsage());
        post.setUpdatedAt(OffsetDateTime.now());
        auditService.record(principal, AuditAction.POST_UPDATED, AuditTargetType.POST, postId);
        requestAutoThumbnail(post);
        return post;
    }

    /**
     * F-REV-05 ベストレビュー選択。★投稿者のみ（loadOwned で 404）。
     * 指定レビューが当該投稿の未削除レビューであることを検証（他投稿/削除済みは弾く）。
     */
    @Transactional
    public Post selectBestReview(AuthPrincipal principal, Long postId, Long reviewId) {
        Post post = loadOwned(principal, postId);
        Review review = reviewRepository.findByIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("review not found: " + reviewId));
        if (!review.getPostId().equals(postId)) {
            throw new InvalidRequestException("そのレビューはこの投稿のものではありません");
        }
        post.setBestReviewId(reviewId);
        post.setUpdatedAt(OffsetDateTime.now());
        // ベストに選ばれたレビュアーへ通知（自分のレビューを選ぶことは自己レビュー禁止により起きない）
        notificationService.notify(review.getReviewerUserId(), principal.userId(),
                com.reviewboard.domain.notification.NotificationType.BEST_REVIEW_SELECTED,
                postId, reviewId);
        return post;
    }

    /** F-POST-02 論理削除（母 S-4）。所有者のみ（不一致は 404）。 */
    @Transactional
    public void delete(AuthPrincipal principal, Long postId) {
        Post post = loadOwned(principal, postId);
        post.setDeletedAt(OffsetDateTime.now());
        auditService.record(principal, AuditAction.POST_DELETED, AuditTargetType.POST, postId);
    }

    /**
     * F-SAFE-01 / F-REQ-01：投稿者のレビュー希望（トーン・募集観点）を反映する。
     * tone は null で未設定に戻る。aspects は送られた集合で全置換（null は空集合扱い）。
     * 設定主体は所有者に限る（呼び出し元の create/loadOwned で担保。★S軸）。
     */
    private void applyReviewPreferences(Post post, Set<ReviewTone> tones, Set<ReviewAspect> aspects, AiUsage aiUsage) {
        post.setAiUsage(aiUsage);
        post.getReviewTones().clear();
        if (tones != null) {
            post.getReviewTones().addAll(tones);
        }
        post.getReviewAspects().clear();
        if (aspects != null) {
            post.getReviewAspects().addAll(aspects);
        }
    }

    /**
     * 自 cohort・未削除の投稿を取得し、所有者でなければ 404。
     * 「他人のもの」を 403 ではなく 404 にするのは存在を漏らさないため（★S軸・IDOR）。
     */
    private Post loadOwned(AuthPrincipal principal, Long postId) {
        Post post = postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
        if (!post.getAuthorUserId().equals(principal.userId())) {
            throw new ResourceNotFoundException("not the owner: " + postId);
        }
        return post;
    }
}
