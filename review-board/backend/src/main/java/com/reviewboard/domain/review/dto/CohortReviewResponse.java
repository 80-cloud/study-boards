package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.Review;
import com.reviewboard.domain.user.UserRole;

import java.time.OffsetDateTime;

/**
 * cohort 全体のレビュー一覧（#210）の 1 行。どの投稿への何というレビューかを一覧で見せるため、
 * レビュー本体に加えて投稿タイトル（postTitle）と reviewer の表示名・role を含める。
 * ★セキュリティ：母集合は呼び出し元（ReviewService）が自 cohort の投稿に限定して渡す。
 */
public record CohortReviewResponse(
        Long id,
        Long postId,
        String postTitle,
        Long reviewerUserId,
        String reviewerDisplayName,
        String reviewerAvatarUrl,
        UserRole reviewerRole,
        boolean teacherReview,
        String good,
        String improvement,
        int thanksCount,
        int repliesCount,
        OffsetDateTime createdAt) {

    public static CohortReviewResponse from(Review r, String postTitle, String reviewerDisplayName,
                                            String reviewerAvatarUrl, UserRole reviewerRole) {
        return new CohortReviewResponse(
                r.getId(), r.getPostId(), postTitle,
                r.getReviewerUserId(), reviewerDisplayName, reviewerAvatarUrl,
                reviewerRole, reviewerRole == UserRole.TEACHER,
                r.getGood(), r.getImprovement(), r.getThanksCount(), r.getRepliesCount(),
                r.getCreatedAt());
    }
}
