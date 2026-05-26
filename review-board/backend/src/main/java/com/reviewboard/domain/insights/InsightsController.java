package com.reviewboard.domain.insights;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.insights.dto.EngagementMetricsResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * エンゲージメント計測 API（#273・★S軸・運営限定）。
 * 講師/管理者のみが自 cohort の「使われ方」を取得できる（受講生403・未認証401・他 cohort 不可視）。
 * 非競争方針：本 API は運営専用で、学生 UI には一切露出しない。
 */
@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final EngagementMetricsService engagementMetricsService;

    public InsightsController(EngagementMetricsService engagementMetricsService) {
        this.engagementMetricsService = engagementMetricsService;
    }

    /**
     * 自 cohort のエンゲージメント指標。
     *
     * @param days 停滞メンバー判定の窓（日）。1〜365 にクランプ。既定は 14。
     */
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    @GetMapping("/engagement")
    public EngagementMetricsResponse engagement(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(name = "days", required = false,
                    defaultValue = "" + EngagementMetricsService.DEFAULT_STAGNANT_DAYS) int days) {
        int clamped = Math.min(Math.max(days, 1), 365);
        return engagementMetricsService.compute(principal, clamped);
    }
}
