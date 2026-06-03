package com.reviewboard.domain.stats;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.stats.dto.LandingStatsResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 集計 API。認証必須・cohort 境界は {@link StatsService} に集約（★セキュリティ）。
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /** トップpage（案L ランディング）の統計＋実績ユーザ（同 cohort 内）。 */
    @GetMapping("/landing")
    public LandingStatsResponse landing(@AuthenticationPrincipal AuthPrincipal principal) {
        return statsService.landing(principal);
    }
}
