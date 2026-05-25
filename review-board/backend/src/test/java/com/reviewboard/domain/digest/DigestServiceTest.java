package com.reviewboard.domain.digest;

import com.reviewboard.domain.notificationpref.dto.NotificationPrefResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DigestService の純粋ロジック（Spring 不要）。opt-in 判定と本文生成を単体で固める。
 */
class DigestServiceTest {

    @Test
    void shouldSendDigest_requires_both_email_and_weekly_on() {
        assertThat(DigestService.shouldSendDigest(new NotificationPrefResponse(true, true))).isTrue();
        assertThat(DigestService.shouldSendDigest(new NotificationPrefResponse(true, false))).isFalse();
        assertThat(DigestService.shouldSendDigest(new NotificationPrefResponse(false, true))).isFalse();
        assertThat(DigestService.shouldSendDigest(new NotificationPrefResponse(false, false))).isFalse();
        assertThat(DigestService.shouldSendDigest(null)).isFalse();
    }

    @Test
    void buildBody_includes_counts_and_link() {
        String body = DigestService.buildBody("レビューラボ", "山田", 3, 2, "https://app.example");
        assertThat(body).contains("山田 さん");
        assertThat(body).contains("3 件");      // 未レビュー
        assertThat(body).contains("2 件");      // 未読通知
        assertThat(body).contains("https://app.example");
        assertThat(body).contains("— レビューラボ");
    }

    @Test
    void buildBody_omits_unread_line_when_zero() {
        String body = DigestService.buildBody("レビューラボ", "佐藤", 1, 0, "");
        assertThat(body).contains("1 件");
        assertThat(body).doesNotContain("未読の通知");
    }
}
