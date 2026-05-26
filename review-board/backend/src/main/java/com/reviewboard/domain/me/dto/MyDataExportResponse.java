package com.reviewboard.domain.me.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 自分のデータのエクスポート（#261・GDPR 的なデータポータビリティの最小実装）。
 * プロフィール＋自分の投稿＋自分が書いたレビューを JSON で返す。
 * パスワードハッシュ・TOTP シークレット等の機密は含めない。
 */
public record MyDataExportResponse(
        OffsetDateTime exportedAt,
        Profile profile,
        List<ExportedPost> posts,
        List<ExportedReview> reviews) {

    public record Profile(
            Long id,
            String email,
            String displayName,
            String role,
            Long cohortId,
            String bio,
            boolean mfaEnabled,
            int receivedReviewsCount,
            int givenReviewsCount,
            int thanksReceivedCount,
            OffsetDateTime createdAt) {
    }

    public record ExportedPost(
            Long id,
            String title,
            String description,
            String repoUrl,
            String demoUrl,
            String recruitStatus,
            int reviewCount,
            int likeCount,
            OffsetDateTime createdAt) {
    }

    public record ExportedReview(
            Long id,
            Long postId,
            String good,
            String improvement,
            String growthStatus,
            String beforeAfter,
            int thanksCount,
            int repliesCount,
            OffsetDateTime createdAt) {
    }
}
