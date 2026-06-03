package com.reviewboard.domain.stats;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.evaluation.Evaluation;
import com.reviewboard.domain.evaluation.EvaluationRepository;
import com.reviewboard.domain.evaluation.EvaluationResult;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.stats.dto.LandingStatsResponse;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * トップページの集計（案L ランディング）。★セキュリティ：集計は閲覧者の cohort 内に閉じる。
 * 母集合（cohort の投稿）を一度引いて、件数・合格・実績をメモリ上で束ねる（cohort 規模は小さい・共通設計方針）。
 */
@Service
public class StatsService {

    /** ヒーロー右側に出す実績ユーザの最大数。 */
    private static final int FEATURED_LIMIT = 3;

    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;

    public StatsService(PostRepository postRepository, ReviewRepository reviewRepository,
                        EvaluationRepository evaluationRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.evaluationRepository = evaluationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public LandingStatsResponse landing(AuthPrincipal principal) {
        Long cohortId = principal.cohortId();

        List<Post> posts = postRepository.findByCohortIdAndDeletedAtIsNull(cohortId);
        List<Long> postIds = posts.stream().map(Post::getId).toList();

        long reviewsCount = postIds.isEmpty() ? 0
                : reviewRepository.findByPostIdInAndDeletedAtIsNull(postIds).size();

        // 最新評価が「合格」の投稿（合格バッジ数＋実績ユーザの合格判定に使う）。
        List<Evaluation> approved = postIds.isEmpty() ? List.of()
                : evaluationRepository.findByPostIdInAndLatestIsTrue(postIds).stream()
                    .filter(e -> e.getResult() == EvaluationResult.APPROVED)
                    .toList();

        Map<Long, Long> authorByPost = posts.stream()
                .collect(Collectors.toMap(Post::getId, Post::getAuthorUserId));
        Set<Long> approvedAuthorIds = approved.stream()
                .map(e -> authorByPost.get(e.getPostId()))
                .collect(Collectors.toSet());
        Map<Long, Long> postsByAuthor = posts.stream()
                .collect(Collectors.groupingBy(Post::getAuthorUserId, Collectors.counting()));

        // 実績ユーザ：投稿を持つ同 cohort メンバーを受領レビュー数の多い順に最大 N 名。
        List<LandingStatsResponse.FeaturedUser> featured = userRepository.findByCohortId(cohortId).stream()
                .filter(u -> postsByAuthor.containsKey(u.getId()))
                .sorted(Comparator.comparingInt(User::getReceivedReviewsCount).reversed())
                .limit(FEATURED_LIMIT)
                .map(u -> new LandingStatsResponse.FeaturedUser(
                        u.getId(), u.getDisplayName(), u.getRole(),
                        postsByAuthor.getOrDefault(u.getId(), 0L).intValue(),
                        u.getReceivedReviewsCount(),
                        approvedAuthorIds.contains(u.getId())))
                .toList();

        return new LandingStatsResponse(posts.size(), reviewsCount, approved.size(), featured);
    }
}
