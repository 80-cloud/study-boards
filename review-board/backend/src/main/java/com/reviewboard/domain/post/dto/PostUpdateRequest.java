package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.AiUsage;
import com.reviewboard.domain.post.ReviewAspect;
import com.reviewboard.domain.post.ReviewTone;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * 投稿更新リクエスト（F-POST-02）。所有者のみ実行可（Service で検証、不一致は 404）。
 *
 * @param reviewTones   F-SAFE-01 歓迎トーン（任意・多値・送られた集合で全置換）
 * @param reviewAspects F-REQ-01 募集観点（任意・送られた集合で全置換）
 * @param aiUsage       AI使用状況の開示タグ（任意・null は未申告に戻す・Issue #172）
 */
public record PostUpdateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank String description,
        @Size(max = 512) String repoUrl,
        @Size(max = 512) String demoUrl,
        @Size(max = 512) String screenshotKey,
        Set<ReviewTone> reviewTones,
        Set<ReviewAspect> reviewAspects,
        AiUsage aiUsage) {
}
