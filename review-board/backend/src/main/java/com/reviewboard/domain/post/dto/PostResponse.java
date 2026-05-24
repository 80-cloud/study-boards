package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.AiUsage;
import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.post.ReviewAspect;
import com.reviewboard.domain.post.ReviewTone;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 投稿の詳細レスポンス（F-POST-03 単体取得）。
 */
public record PostResponse(
        Long id,
        Long authorUserId,
        Long cohortId,
        String title,
        String description,
        String repoUrl,
        String demoUrl,
        String screenshotKey,
        String screenshotUrl,
        RecruitStatus recruitStatus,
        int reviewCount,
        int likeCount,
        boolean liked,
        Long bestReviewId,
        List<ReviewTone> reviewTones,
        List<ReviewAspect> reviewAspects,
        AiUsage aiUsage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    /**
     * @param screenshotUrl 表示用の署名付き GET URL（SEC-8：private 保存・短命 URL のみ公開）。
     *                      key が無ければ null。生成は {@code StorageService} が担い、Controller で渡す。
     * @param liked         閲覧者がこの投稿にいいね済みか（ボタンの押下状態用）。
     */
    public static PostResponse from(Post p, String screenshotUrl, boolean liked) {
        return new PostResponse(
                p.getId(), p.getAuthorUserId(), p.getCohortId(),
                p.getTitle(), p.getDescription(), p.getRepoUrl(), p.getDemoUrl(),
                p.getScreenshotKey(), screenshotUrl, p.getRecruitStatus(), p.getReviewCount(),
                p.getLikeCount(), liked,
                p.getBestReviewId(), new ArrayList<>(p.getReviewTones()), new ArrayList<>(p.getReviewAspects()),
                p.getAiUsage(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
