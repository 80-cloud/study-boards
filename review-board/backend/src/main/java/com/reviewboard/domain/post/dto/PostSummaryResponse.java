package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;

import java.time.OffsetDateTime;

/**
 * 一覧用の軽量レスポンス（F-POST-03）。本文（description）は載せず転送量を抑える（母 P-2）。
 */
public record PostSummaryResponse(
        Long id,
        Long authorUserId,
        String title,
        RecruitStatus recruitStatus,
        int reviewCount,
        OffsetDateTime createdAt) {

    public static PostSummaryResponse from(Post p) {
        return new PostSummaryResponse(
                p.getId(), p.getAuthorUserId(), p.getTitle(),
                p.getRecruitStatus(), p.getReviewCount(), p.getCreatedAt());
    }
}
