package com.reviewboard.domain.invite;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.invite.dto.InviteCreateRequest;
import com.reviewboard.domain.invite.dto.InviteResponse;
import com.reviewboard.domain.user.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 招待コード管理 API（★セキュリティ・講師/管理者のみ・Issue #165 / #511）。
 * クラス全体を {@code hasAnyRole('TEACHER','ADMIN')} で保護し、受講生は 403。
 * #511：targetRole=TEACHER 招待は ADMIN 限定（権限昇格防止・F-EVAL-01 と同方針）。
 * 対象は常に呼び出し元の cohort（cohort 境界は Service 側で担保）。
 */
@RestController
@RequestMapping("/api/invites")
@PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
public class InviteController {

    private final InviteService inviteService;

    public InviteController(InviteService inviteService) {
        this.inviteService = inviteService;
    }

    /** 招待コードを発行する。生コードはこのレスポンスでのみ返す（再表示不可）。 */
    @PostMapping
    public ResponseEntity<InviteResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                                 @Valid @RequestBody(required = false) InviteCreateRequest request) {
        InviteCreateRequest req = request != null ? request : new InviteCreateRequest(null, null, null);
        UserRole targetRole = req.targetRoleOrDefault();
        // #511：ADMIN 招待は本機能では発行しない（管理者は bootstrap 経由のみ）。
        if (targetRole == UserRole.ADMIN) {
            throw new InvalidRequestException("ADMIN 招待は発行できません");
        }
        // #511：TEACHER 招待は ADMIN ロールのみ発行可。TEACHER ロールでの発行は 403。
        if (targetRole == UserRole.TEACHER && principal.role() != UserRole.ADMIN) {
            throw new AccessDeniedException("講師招待は管理者のみ発行できます");
        }
        InviteService.Issued issued = inviteService.issue(principal,
                req.maxUsesOrDefault(), req.expiresInDaysOrDefault(), targetRole);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(InviteResponse.withRawCode(issued.invite(), issued.rawCode(), OffsetDateTime.now()));
    }

    /** 自 cohort の招待一覧（生コードは含まない）。 */
    @GetMapping
    public List<InviteResponse> list(@AuthenticationPrincipal AuthPrincipal principal) {
        OffsetDateTime now = OffsetDateTime.now();
        return inviteService.list(principal).stream().map(i -> InviteResponse.of(i, now)).toList();
    }

    /** 招待を失効させる（自 cohort 以外は 404）。 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(@AuthenticationPrincipal AuthPrincipal principal,
                                       @PathVariable Long id) {
        inviteService.revoke(principal, id);
        return ResponseEntity.noContent().build();
    }
}
