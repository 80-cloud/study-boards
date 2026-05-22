package com.reviewboard.domain.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 投稿更新リクエスト（F-POST-02）。所有者のみ実行可（Service で検証、不一致は 404）。
 */
public record PostUpdateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank String description,
        @Size(max = 512) String repoUrl,
        @Size(max = 512) String demoUrl,
        @Size(max = 512) String screenshotKey) {
}
