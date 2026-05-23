package com.reviewboard.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** cohort（期）作成リクエスト（ADMIN のみ）。 */
public record CohortCreateRequest(
        @NotBlank @Size(max = 100) String name) {
}
