package com.reviewboard.domain.post;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    /** 一覧で「自分がいいね済みの投稿」をまとめて判定（N+1 回避）。 */
    List<PostLike> findByUserIdAndPostIdIn(Long userId, List<Long> postIds);

    /** 再計算（S-3 権威ソース）：投稿のいいね数。 */
    int countByPostId(Long postId);
}
