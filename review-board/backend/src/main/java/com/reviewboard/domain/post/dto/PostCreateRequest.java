package com.reviewboard.domain.post.dto;

import com.reviewboard.domain.post.AiUsage;
import com.reviewboard.domain.post.ReviewAspect;
import com.reviewboard.domain.post.ReviewTone;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * 投稿作成リクエスト（F-POST-01）。タイトルと説明は必須、URL/スクショキーは任意。
 * cohort_id・author は principal（検証済み JWT）から導出し、クライアント入力は信用しない（★セキュリティ）。
 *
 * @param reviewTones   F-SAFE-01 歓迎トーン（任意・多値・Set で重複排除。空は未設定）
 * @param reviewAspects F-REQ-01 募集観点（任意・Set で重複排除。不正な enum 値は 400）
 * @param aiUsage       AI使用状況の開示タグ（任意・null は未申告・Issue #172）
 */
public record PostCreateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank String description,
        @Size(max = 512) String repoUrl,
        @Size(max = 512) String demoUrl,
        @Size(max = 512) String screenshotKey,
        Set<ReviewTone> reviewTones,
        Set<ReviewAspect> reviewAspects,
        AiUsage aiUsage) {
}
