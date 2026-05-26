package com.reviewboard.domain.me;

import com.reviewboard.domain.me.dto.MyDataExportResponse;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 自分のデータのエクスポート（#261）。常に principal の userId のデータのみを集約する
 * （他人の資源には触れない＝IDOR の余地を作らない）。論理削除済みは含めない。
 */
@Service
public class DataExportService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ReviewRepository reviewRepository;

    public DataExportService(UserRepository userRepository, PostRepository postRepository,
                             ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    public MyDataExportResponse export(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));

        MyDataExportResponse.Profile profile = new MyDataExportResponse.Profile(
                user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name(),
                user.getCohortId(), user.getBio(), user.isMfaEnabled(),
                user.getReceivedReviewsCount(), user.getGivenReviewsCount(), user.getThanksReceivedCount(),
                user.getCreatedAt());

        List<MyDataExportResponse.ExportedPost> posts =
                postRepository.findByAuthorUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId).stream()
                        .map(this::toPost).toList();

        List<MyDataExportResponse.ExportedReview> reviews =
                reviewRepository.findByReviewerUserIdAndDeletedAtIsNull(userId).stream()
                        .map(this::toReview).toList();

        return new MyDataExportResponse(OffsetDateTime.now(), profile, posts, reviews);
    }

    private MyDataExportResponse.ExportedPost toPost(Post p) {
        return new MyDataExportResponse.ExportedPost(
                p.getId(), p.getTitle(), p.getDescription(), p.getRepoUrl(), p.getDemoUrl(),
                p.getRecruitStatus() == null ? null : p.getRecruitStatus().name(),
                p.getReviewCount(), p.getLikeCount(), p.getCreatedAt());
    }

    private MyDataExportResponse.ExportedReview toReview(Review r) {
        return new MyDataExportResponse.ExportedReview(
                r.getId(), r.getPostId(), r.getGood(), r.getImprovement(),
                r.getGrowthStatus() == null ? null : r.getGrowthStatus().name(),
                r.getBeforeAfter(), r.getThanksCount(), r.getRepliesCount(), r.getCreatedAt());
    }
}
