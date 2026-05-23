package com.reviewboard.domain.post;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditService;
import com.reviewboard.domain.audit.AuditTargetType;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.dto.PostCreateRequest;
import com.reviewboard.domain.post.dto.PostUpdateRequest;
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

    public PostService(PostRepository postRepository, ReviewRepository reviewRepository,
                       AuditService auditService) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.auditService = auditService;
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
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postRepository.save(post);
        auditService.record(principal, AuditAction.POST_CREATED, AuditTargetType.POST, post.getId());
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
     * @param status        募集状態フィルタ（null は無視）
     * @param unreviewedOnly 未レビュー（review_count=0）のみに絞る
     * @param sort          並び順："reviews"（レビュー数降順）／それ以外は新着降順
     */
    @Transactional(readOnly = true)
    public Slice<Post> search(AuthPrincipal principal, String q, RecruitStatus status,
                              boolean unreviewedOnly, String sort, Pageable pageable) {
        String keyword = (q == null || q.isBlank()) ? null : q.trim();
        Sort order = "reviews".equals(sort)
                ? Sort.by(Sort.Direction.DESC, "reviewCount").and(Sort.by(Sort.Direction.DESC, "createdAt"))
                : Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), order);
        return postRepository.search(principal.cohortId(), keyword, status, unreviewedOnly, sorted);
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
        post.setUpdatedAt(OffsetDateTime.now());
        auditService.record(principal, AuditAction.POST_UPDATED, AuditTargetType.POST, postId);
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
