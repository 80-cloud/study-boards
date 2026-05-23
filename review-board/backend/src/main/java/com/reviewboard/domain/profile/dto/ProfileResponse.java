package com.reviewboard.domain.profile.dto;

import com.reviewboard.domain.evaluation.EvaluationResult;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.user.UserRole;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * 成長記録ページ（F-PROF・本アプリの主役）のレスポンス。
 * 投稿履歴・もらったレビュー・実績数・合格バッジ・継続記録を1ユーザー視点で集約する。
 */
public record ProfileResponse(
        Long userId,
        String displayName,
        UserRole role,
        String bio,
        Stats stats,
        Streak streak,
        List<PostEntry> posts,
        List<ReceivedReview> receivedReviews) {

    /** F-PROF-03 実績数（非正規化カウンタ） */
    public record Stats(int receivedReviewsCount, int givenReviewsCount, int thanksReceivedCount) {
    }

    /**
     * F-STREAK-01 継続の可視化（§1-6 継続は力なり・非競争）。
     *
     * @param currentStreak   今日 or 昨日を起点に連続する活動日数
     * @param longestStreak   過去の最長連続活動日数
     * @param totalActiveDays 活動した延べ日数（重複排除）
     * @param lastActiveDate  最終活動日（活動なしは null）
     * @param achievedBadges  達成済みの連続日数バッジ（例：[3,7]）
     */
    public record Streak(
            int currentStreak,
            int longestStreak,
            int totalActiveDays,
            LocalDate lastActiveDate,
            List<Integer> achievedBadges) {
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
