package com.reviewboard.domain.user;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.audit.AuditAction;
import com.reviewboard.domain.audit.AuditService;
import com.reviewboard.domain.audit.AuditTargetType;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.auth.RefreshTokenRepository;
import com.reviewboard.domain.user.dto.MemberResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * メンバー管理（#229・kick）。★セキュリティ：講師は自 cohort の受講生のみ、管理者は管理者以外を操作可。
 *
 * <p>無効化（DISABLED）するとログイン不可（{@code AuthService.login} が 403）になり、
 * refresh トークンを全失効させるため、既存の access トークンも最長で寿命（15分）内に失効する。
 */
@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;

    public UserAdminService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                            AuditService auditService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
    }

    /** 自 cohort のメンバー一覧（講師の管理画面用）。 */
    @Transactional(readOnly = true)
    public List<MemberResponse> listCohortMembers(AuthPrincipal principal) {
        return userRepository.findByCohortId(principal.cohortId()).stream()
                .map(MemberResponse::from)
                .toList();
    }

    /** 無効化（kick）。refresh を全失効＝既存 access も最長15分で失効。 */
    @Transactional
    public MemberResponse disable(AuthPrincipal principal, Long targetId) {
        User target = loadManageable(principal, targetId);
        target.setStatus(UserStatus.DISABLED);
        target.setUpdatedAt(OffsetDateTime.now());
        refreshTokenRepository.revokeAllActiveByUserId(target.getId(), OffsetDateTime.now());
        auditService.record(principal, AuditAction.USER_DISABLED, AuditTargetType.USER, target.getId());
        return MemberResponse.from(target);
    }

    /** 再有効化。 */
    @Transactional
    public MemberResponse enable(AuthPrincipal principal, Long targetId) {
        User target = loadManageable(principal, targetId);
        target.setStatus(UserStatus.ACTIVE);
        target.setUpdatedAt(OffsetDateTime.now());
        auditService.record(principal, AuditAction.USER_ENABLED, AuditTargetType.USER, target.getId());
        return MemberResponse.from(target);
    }

    /**
     * 操作対象を取得し、操作可否を検証する。
     * 自分自身は不可（400）。講師は自 cohort の受講生のみ（他 cohort は 404・非受講生は 403）。
     * 管理者は管理者以外（管理者は 403）。
     */
    private User loadManageable(AuthPrincipal principal, Long targetId) {
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("user not found: " + targetId));
        if (target.getId().equals(principal.userId())) {
            throw new InvalidRequestException("自分自身は操作できません");
        }
        if (principal.role() == UserRole.TEACHER) {
            if (!target.getCohortId().equals(principal.cohortId())) {
                // 他 cohort は存在を漏らさず 404（IDOR 遮断）
                throw new ResourceNotFoundException("user not found: " + targetId);
            }
            if (target.getRole() != UserRole.STUDENT) {
                throw new AccessDeniedException("受講生のみ操作できます");
            }
        } else { // ADMIN
            if (target.getRole() == UserRole.ADMIN) {
                throw new AccessDeniedException("管理者は操作できません");
            }
        }
        return target;
    }
}
