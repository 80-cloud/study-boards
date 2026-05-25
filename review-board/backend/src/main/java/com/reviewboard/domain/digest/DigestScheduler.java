package com.reviewboard.domain.digest;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 週次ダイジェストの定期実行（Issue #233・C-5）。既定は毎週月曜 08:00。
 * cron は {@code app.digest.cron} で上書き可。{@code app.digest.enabled=false} で無効化できる
 * （テスト・一時停止用）。実処理は {@link DigestService} に委譲する。
 */
@Component
@ConditionalOnProperty(value = "app.digest.enabled", matchIfMissing = true)
public class DigestScheduler {

    private final DigestService digestService;

    public DigestScheduler(DigestService digestService) {
        this.digestService = digestService;
    }

    @Scheduled(cron = "${app.digest.cron:0 0 8 * * MON}")
    public void runScheduled() {
        digestService.sendWeeklyDigests();
    }
}
