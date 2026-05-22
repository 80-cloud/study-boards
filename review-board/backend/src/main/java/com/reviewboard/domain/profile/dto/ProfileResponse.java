package com.reviewboard.domain.profile.dto;

import com.reviewboard.domain.evaluation.EvaluationResult;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.user.UserRole;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 成長記録ページ（F-PROF・本アプリの主役）のレスポンス。
 * 投稿履歴・もらったレビュー・実績数・合格バッジを1ユーザー視点で集約する。
 */
public record ProfileResponse(
        Long userId,
        String displayName,
        UserRole role,
        String bio,
        Stats stats,
        List<PostEntry> posts,
        List<ReceivedReview> receivedReviews) {

    /** F-PROF-03 実績数（非正規化カウンタ） */
    public record Stats(int receivedReviewsCount, int givenReviewsCount, int thanksReceivedCount) {
    }

    /** F-PROF-01 投稿履歴 ＋ F-PROF-04 合格バッジ（approved） */
    public record PostEntry(
            Long postId,
            String title,
            RecruitStatus recruitStatus,
            int reviewCount,
            boolean approved,
            EvaluationResult evaluationResult,
            OffsetDateTime createdAt) {
    }

    /** F-PROF-02 もらったレビュー（reviewer の role で講師レビューを強調可能） */
    public record ReceivedReview(
            Long reviewId,
            Long postId,
            String reviewerDisplayName,
            UserRole reviewerRole,
            boolean teacherReview,
            String good,
            String improvement,
            int thanksCount,
            OffsetDateTime createdAt) {
    }
}
