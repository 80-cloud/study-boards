package com.reviewboard.domain.user;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.user.dto.MemberResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * メンバー管理 API（#229・kick）。講師・管理者のみ（クラス全体を {@code hasAnyRole}）。
 * cohort 境界・対象ロールの検証は {@link UserAdminService} に集約する（★S軸）。
 */
@RestController
@RequestMapping("/api/members")
@PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    /** 自 cohort のメンバー一覧。 */
    @GetMapping
    public List<MemberResponse> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return userAdminService.listCohortMembers(principal);
    }

    /** 無効化（kick）。 */
    @PutMapping("/{id}/disable")
    public MemberResponse disable(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return userAdminService.disable(principal, id);
    }

    /** 再有効化。 */
    @PutMapping("/{id}/enable")
    public MemberResponse enable(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return userAdminService.enable(principal, id);
    }
}
