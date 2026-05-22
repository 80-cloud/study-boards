package com.reviewboard.domain.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 投稿作成リクエスト（F-POST-01）。タイトルと説明は必須、URL/スクショキーは任意。
 * cohort_id・author は principal（検証済み JWT）から導出し、クライアント入力は信用しない（★S軸）。
 */
public record PostCreateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank String description,
        @Size(max = 512) String repoUrl,
        @Size(max = 512) String demoUrl,
        @Size(max = 512) String screenshotKey) {
}
