package com.reviewboard.domain.profile;

import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.evaluation.Evaluation;
import com.reviewboard.domain.evaluation.EvaluationRepository;
import com.reviewboard.domain.evaluation.EvaluationResult;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.profile.dto.ProfileResponse;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 成長記録ページの集約（F-PROF・主役）。★S軸：閲覧対象は同 cohort のメンバーに限る（他 cohort は 404）。
 * 投稿・評価・レビュー・reviewer をバッチで引いて N+1 を避ける（母 P-3）。
 */
@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;
    private final EvaluationRepository evaluationRepository;

    public ProfileService(UserRepository userRepository, PostRepository postRepository,
                         ReviewRepository reviewRepository, EvaluationRepository evaluationRepository) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(AuthPrincipal principal, Long userId) {
        // cohort 境界：同 cohort のメンバーのみ可視（他 cohort は 404）
        User target = userRepository.findByIdAndCohortId(userId, principal.cohortId())
                .orElseThrow(() -> new ResourceNotFoundException("user not found: " + userId));

        List<Post> posts = postRepository.findByAuthorUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId);
        List<Long> postIds = posts.stream().map(Post::getId).toList();

        Map<Long, EvaluationResult> latestByPost = postIds.isEmpty() ? Map.of()
                : evaluationRepository.findByPostIdInAndLatestIsTrue(postIds).stream()
                    .collect(Collectors.toMap(Evaluation::getPostId, Evaluation::getResult));

        List<Review> reviews = postIds.isEmpty() ? List.of()
                : reviewRepository.findByPostIdInAndDeletedAtIsNull(postIds);
        Set<Long> reviewerIds = reviews.stream().map(Review::getReviewerUserId).collect(Collectors.toSet());
        Map<Long, User> reviewers = reviewerIds.isEmpty() ? Map.of()
                : userRepository.findAllById(reviewerIds).stream()
                    .collect(Collectors.toMap(User::getId, Function.identity()));

        List<ProfileResponse.PostEntry> postEntries = posts.stream().map(p -> {
            EvaluationResult result = latestByPost.get(p.getId());
            return new ProfileResponse.PostEntry(
                    p.getId(), p.getTitle(), p.getRecruitStatus(), p.getReviewCount(),
                    result == EvaluationResult.APPROVED, result, p.getCreatedAt());
        }).toList();

        List<ProfileResponse.ReceivedReview> received = reviews.stream().map(r -> {
            User reviewer = reviewers.get(r.getReviewerUserId());
            UserRole role = reviewer != null ? reviewer.getRole() : null;
            return new ProfileResponse.ReceivedReview(
                    r.getId(), r.getPostId(),
                    reviewer != null ? reviewer.getDisplayName() : "(不明)",
                    role, role == UserRole.TEACHER,
                    r.getGood(), r.getImprovement(), r.getThanksCount(), r.getCreatedAt());
        }).toList();

        ProfileResponse.Stats stats = new ProfileResponse.Stats(
                target.getReceivedReviewsCount(), target.getGivenReviewsCount(),
                target.getThanksReceivedCount());

        return new ProfileResponse(
                target.getId(), target.getDisplayName(), target.getRole(), target.getBio(),
                stats, postEntries, received);
    }
}
