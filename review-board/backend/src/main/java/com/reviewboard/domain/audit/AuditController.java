package com.reviewboard.domain.audit;

import com.reviewboard.domain.audit.dto.AuditLogResponse;
import com.reviewboard.domain.auth.AuthPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 監査ログ閲覧 API（★S軸）。監査情報は機微なため講師ロール限定・自 cohort のみ。
 */
@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    /** 監査ログ一覧（講師限定・自 cohort・新しい順） */
    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping
    public Page<AuditLogResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PageableDefault(size = 50) Pageable pageable) {
        return auditService.listForCohort(principal, pageable).map(AuditLogResponse::from);
    }
}
