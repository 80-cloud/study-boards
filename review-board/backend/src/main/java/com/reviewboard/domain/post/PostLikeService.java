package com.reviewboard.domain.post;

import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * いいね（👍）のユースケース。★S軸：対象投稿は同 cohort・未削除に限る（他は 404）。
 * いいね数は Post の非正規化カウンタを同一Txで増減する（一覧・ランキングの軽量化）。
 */
@Service
public class PostLikeService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;

    public PostLikeService(PostRepository postRepository, PostLikeRepository postLikeRepository) {
        this.postRepository = postRepository;
        this.postLikeRepository = postLikeRepository;
    }

    /** いいねを付ける（冪等：既にあれば数は変えない）。更新後のいいね数を返す。 */
    @Transactional
    public int like(AuthPrincipal principal, Long postId) {
        Post post = load(principal, postId);
        if (!postLikeRepository.existsByPostIdAndUserId(postId, principal.userId())) {
            PostLike like = new PostLike();
            like.setPostId(postId);
            like.setUserId(principal.userId());
            like.setCreatedAt(OffsetDateTime.now());
            postLikeRepository.save(like);
            post.setLikeCount(post.getLikeCount() + 1);
        }
        return post.getLikeCount();
    }

    /** いいねを外す（冪等：無ければ何もしない）。更新後のいいね数を返す。 */
    @Transactional
    public int unlike(AuthPrincipal principal, Long postId) {
        Post post = load(principal, postId);
        postLikeRepository.findByPostIdAndUserId(postId, principal.userId()).ifPresent((existing) -> {
            postLikeRepository.delete(existing);
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
        });
        return post.getLikeCount();
    }

    private Post load(AuthPrincipal principal, Long postId) {
        return postRepository.findByIdAndCohortIdAndDeletedAtIsNull(postId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("post not found: " + postId));
    }
}
