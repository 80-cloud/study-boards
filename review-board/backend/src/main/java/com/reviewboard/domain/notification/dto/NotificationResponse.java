package com.reviewboard.domain.notification.dto;

import com.reviewboard.domain.notification.Notification;
import com.reviewboard.domain.notification.NotificationType;

import java.time.OffsetDateTime;

/**
 * 通知1件のレスポンス。actor の表示名は呼び出し側でまとめ引きして渡す（N+1回避）。
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        Long actorUserId,
        String actorDisplayName,
        Long postId,
        Long reviewId,
        boolean read,
        OffsetDateTime createdAt) {

    public static NotificationResponse from(Notification n, String actorDisplayName) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getActorUserId(), actorDisplayName,
                n.getPostId(), n.getReviewId(), n.getReadAt() != null, n.getCreatedAt());
    }
}
