package com.reviewboard.domain.notificationpref.dto;

import com.reviewboard.domain.notificationpref.UserNotificationPref;

/** 通知設定のレスポンス。行が無いユーザーは既定（全 ON）を返す。 */
public record NotificationPrefResponse(boolean emailEnabled, boolean weeklyDigest) {

    public static NotificationPrefResponse defaults() {
        return new NotificationPrefResponse(true, true);
    }

    public static NotificationPrefResponse from(UserNotificationPref pref) {
        return new NotificationPrefResponse(pref.isEmailEnabled(), pref.isWeeklyDigest());
    }
}
