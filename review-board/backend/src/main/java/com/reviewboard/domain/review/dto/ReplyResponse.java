package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.ReviewReply;

import java.time.OffsetDateTime;

/** F-REV-04 返信の表示。 */
public record ReplyResponse(
        Long id,
        Long reviewId,
        Long replierUserId,
        String replierDisplayName,
        String body,
        OffsetDateTime createdAt) {

    public static ReplyResponse from(ReviewReply r, String replierDisplayName) {
        return new ReplyResponse(r.getId(), r.getReviewId(), r.getReplierUserId(),
                replierDisplayName, r.getBody(), r.getCreatedAt());
    }
}
