package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;

import java.time.OffsetDateTime;

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
        RecruitStatus recruitStatus,
        int reviewCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static PostResponse from(Post p) {
        return new PostResponse(
                p.getId(), p.getAuthorUserId(), p.getCohortId(),
                p.getTitle(), p.getDescription(), p.getRepoUrl(), p.getDemoUrl(),
                p.getScreenshotKey(), p.getRecruitStatus(), p.getReviewCount(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
