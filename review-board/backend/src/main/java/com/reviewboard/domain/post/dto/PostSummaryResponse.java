package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.Post;
import com.reviewboard.domain.post.RecruitStatus;
import com.reviewboard.domain.post.ReviewAspect;
import com.reviewboard.domain.post.ReviewTone;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 一覧用の軽量レスポンス（F-POST-03）。本文（description）は載せず転送量を抑える（母 P-2）。
 * トーン・募集観点は一覧での「依頼の見える化」（F-SAFE-01/F-REQ-01）に使うため含める。
 */
public record PostSummaryResponse(
        Long id,
        Long authorUserId,
        String title,
        RecruitStatus recruitStatus,
        int reviewCount,
        ReviewTone reviewTone,
        List<ReviewAspect> reviewAspects,
        OffsetDateTime createdAt) {

    public static PostSummaryResponse from(Post p) {
        return new PostSummaryResponse(
                p.getId(), p.getAuthorUserId(), p.getTitle(),
                p.getRecruitStatus(), p.getReviewCount(),
                p.getReviewTone(), new ArrayList<>(p.getReviewAspects()), p.getCreatedAt());
    }
}
