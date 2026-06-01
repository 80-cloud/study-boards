package com.reviewboard.domain.notificationpref;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.notificationpref.dto.NotificationPrefResponse;
import com.reviewboard.domain.notificationpref.dto.NotificationPrefUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 通知設定 API（Issue #233・C-5）。★セキュリティ：常に「自分の設定」だけを読み書きする（本人限定・他人の設定は触れない）。
 */
@RestController
@RequestMapping("/api/notification-prefs")
public class NotificationPrefController {

    private final NotificationPrefService service;

    public NotificationPrefController(NotificationPrefService service) {
        this.service = service;
    }

    /** 自分の通知設定を取得（行が無ければ既定の全 ON）。 */
    @GetMapping
    public NotificationPrefResponse get(@AuthenticationPrincipal AuthPrincipal principal) {
        return service.get(principal.userId());
    }

    /** 自分の通知設定を更新。 */
    @PutMapping
    public NotificationPrefResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                                           @Valid @RequestBody NotificationPrefUpdateRequest body) {
        return service.update(principal.userId(), body.emailEnabled(), body.weeklyDigest());
    }
}
