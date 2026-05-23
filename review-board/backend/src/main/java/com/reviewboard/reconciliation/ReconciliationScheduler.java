package com.reviewboard.reconciliation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 再計算バッチの定期実行（S-3）。既定は毎日 04:00（低トラフィック帯）。
 * cron は {@code app.reconciliation.cron} で上書き可。`app.reconciliation.enabled=false` で無効化できる
 * （テストや一時停止用）。実処理は {@link ReconciliationService} に委譲する。
 */
@Component
@ConditionalOnProperty(value = "app.reconciliation.enabled", matchIfMissing = true)
public class ReconciliationScheduler {

    private final ReconciliationService reconciliationService;

    public ReconciliationScheduler(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @Scheduled(cron = "${app.reconciliation.cron:0 0 4 * * *}")
    public void runScheduled() {
        reconciliationService.reconcileAll();
    }
}
