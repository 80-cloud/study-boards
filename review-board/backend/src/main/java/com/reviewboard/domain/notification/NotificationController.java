package com.reviewboard.domain.notification;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.notification.dto.NotificationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 通知 API（F-NOTIF-01）。すべて認証必須。閲覧・既読化は受信者本人のものに限る（Service で検証）。
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /** 自分の通知一覧（新着順） */
    @GetMapping
    public List<NotificationResponse> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return notificationService.list(principal);
    }

    /** 未読件数（ベルのバッジ用・ポーリング） */
    @GetMapping("/unread-count")
    public Map<String, Integer> unreadCount(@AuthenticationPrincipal AuthPrincipal principal) {
        return Map.of("count", notificationService.unreadCount(principal));
    }

    /** 1件を既読化（自分の通知のみ・他人は 404） */
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@AuthenticationPrincipal AuthPrincipal principal,
                                         @PathVariable Long id) {
        notificationService.markRead(principal, id);
        return ResponseEntity.noContent().build();
    }

    /** 自分の未読をすべて既読化 */
    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal AuthPrincipal principal) {
        notificationService.markAllRead(principal);
        return ResponseEntity.noContent().build();
    }
}
