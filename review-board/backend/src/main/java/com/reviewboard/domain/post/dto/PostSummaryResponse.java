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
 * 一覧用の軽量レスポンス（F-POST-03）。本文（description）は載せず転送量を抑える（母 P-2）。
 * トーン・募集観点は一覧での「依頼の見える化」（F-SAFE-01/F-REQ-01）に使うため含める。
 */
public record PostSummaryResponse(
        Long id,
        Long authorUserId,
        String authorDisplayName,
        String title,
        RecruitStatus recruitStatus,
        int reviewCount,
        int likeCount,
        boolean liked,
        List<ReviewTone> reviewTones,
        List<ReviewAspect> reviewAspects,
        AiUsage aiUsage,
        String screenshotUrl,
        OffsetDateTime createdAt) {

    /**
     * 一覧カード表示（案L の WORKS / RANKING）用に著者名・スクショ URL・いいね状態を補って組み立てる。
     * 著者名・URL・liked は呼び出し側でバッチ解決して渡す（N+1 回避・SEC-8）。
     */
    public static PostSummaryResponse from(Post p, String authorDisplayName, String screenshotUrl, boolean liked) {
        return new PostSummaryResponse(
                p.getId(), p.getAuthorUserId(), authorDisplayName, p.getTitle(),
                p.getRecruitStatus(), p.getReviewCount(), p.getLikeCount(), liked,
                new ArrayList<>(p.getReviewTones()), new ArrayList<>(p.getReviewAspects()), p.getAiUsage(),
                screenshotUrl, p.getCreatedAt());
    }
}
