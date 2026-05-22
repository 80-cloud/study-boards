package com.reviewboard.domain.post;

import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.post.dto.PostCreateRequest;
import com.reviewboard.domain.post.dto.PostUpdateRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
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

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
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
        return postRepository.save(post);
    }

    /** F-POST-03 単体取得。自 cohort かつ未削除のみ可視（他は 404）。 */
    @Transactional(readOnly = true)
    public Post get(AuthPrincipal principal, Long postId) {
        return postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
    }

    /** F-POST-03 一覧。自 cohort かつ未削除のみ。ページネーション（母 P-2）。 */
    @Transactional(readOnly = true)
    public Slice<Post> listForCohort(AuthPrincipal principal, Pageable pageable) {
        return postRepository.findByCohortIdAndDeletedAtIsNull(principal.cohortId(), pageable);
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
        return post;
    }

    /** F-POST-02 論理削除（母 S-4）。所有者のみ（不一致は 404）。 */
    @Transactional
    public void delete(AuthPrincipal principal, Long postId) {
        Post post = loadOwned(principal, postId);
        post.setDeletedAt(OffsetDateTime.now());
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
