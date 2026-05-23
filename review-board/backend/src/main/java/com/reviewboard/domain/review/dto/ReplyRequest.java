package com.reviewboard.domain.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** F-REV-04 返信の作成リクエスト。 */
public record ReplyRequest(@NotBlank @Size(max = 2000) String body) {
}
