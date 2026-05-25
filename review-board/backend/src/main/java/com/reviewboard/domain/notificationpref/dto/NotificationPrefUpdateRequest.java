package com.reviewboard.domain.notificationpref.dto;

import jakarta.validation.constraints.NotNull;

/** 通知設定の更新リクエスト。両項目とも必須（UI のトグル現在値をそのまま送る）。 */
public record NotificationPrefUpdateRequest(
        @NotNull Boolean emailEnabled,
        @NotNull Boolean weeklyDigest) {
}
