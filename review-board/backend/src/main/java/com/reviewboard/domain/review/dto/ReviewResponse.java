package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.review.ReviewAxis;
import com.reviewboard.domain.review.ReviewAxisComment;
import com.reviewboard.domain.user.UserRole;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * レビューのレスポンス。reviewer の role/displayName を含め、講師レビューの特別表示
 * （F-REV-02）をフロントで可能にする。teacherReview フラグは利便のため導出。
 */
public record ReviewResponse(
        Long id,
        Long postId,
        Long reviewerUserId,
        String reviewerDisplayName,
        UserRole reviewerRole,
        boolean teacherReview,
        String good,
        String improvement,
        int thanksCount,
        int repliesCount,
        List<AxisComment> axisComments,
        OffsetDateTime createdAt) {

    public record AxisComment(ReviewAxis axis, String comment) {
        static AxisComment from(ReviewAxisComment c) {
            return new AxisComment(c.getAxis(), c.getComment());
        }
    }

    public static ReviewResponse from(Review r, String reviewerDisplayName, UserRole reviewerRole,
                                      List<ReviewAxisComment> axisComments) {
        return new ReviewResponse(
                r.getId(), r.getPostId(), r.getReviewerUserId(),
                reviewerDisplayName, reviewerRole, reviewerRole == UserRole.TEACHER,
                r.getGood(), r.getImprovement(), r.getThanksCount(), r.getRepliesCount(),
                axisComments.stream().map(AxisComment::from).toList(),
                r.getCreatedAt());
    }
}
