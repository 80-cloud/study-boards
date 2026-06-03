package com.reviewboard.domain.invite;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 招待コードの発行・一覧・失効と、登録時の消費（Issue #165 / #511）。
 * ★セキュリティ：発行/一覧/失効は呼び出し元 principal の cohort に限定（cohort 境界）。
 * 生コードは発行時にしか存在せず、保存・検証は SHA-256 hash で行う。
 * #511：targetRole（STUDENT/TEACHER）を招待ごとに保持し、登録時に適用する。
 */
@Service
public class InviteService {

    private final CohortInviteRepository inviteRepository;
    private final InviteCodeGenerator codeGenerator;

    public InviteService(CohortInviteRepository inviteRepository, InviteCodeGenerator codeGenerator) {
        this.inviteRepository = inviteRepository;
        this.codeGenerator = codeGenerator;
    }

    /** 招待を発行する（自 cohort）。生コードは戻り値でのみ返す（保存は hash）。 */
    @Transactional
    public Issued issue(AuthPrincipal principal, int maxUses, int expiresInDays, UserRole targetRole) {
        String rawCode = codeGenerator.generateRawCode();
        CohortInvite invite = new CohortInvite();
        invite.setCohortId(principal.cohortId());
        invite.setCodeHash(codeGenerator.hash(rawCode));
        invite.setCreatedBy(principal.userId());
        invite.setExpiresAt(OffsetDateTime.now().plusDays(expiresInDays));
        invite.setMaxUses(maxUses);
        invite.setCurrentUses(0);
        invite.setTargetRole(targetRole != null ? targetRole : UserRole.STUDENT);
        inviteRepository.save(invite);
        return new Issued(invite, rawCode);
    }

    /** 自 cohort の招待一覧（新しい順）。 */
    @Transactional(readOnly = true)
    public List<CohortInvite> list(AuthPrincipal principal) {
        return inviteRepository.findByCohortIdOrderByCreatedAtDesc(principal.cohortId());
    }

    /** 招待を失効させる。自 cohort 以外・存在しないものは 404（存在を漏らさない）。 */
    @Transactional
    public void revoke(AuthPrincipal principal, Long inviteId) {
        CohortInvite invite = inviteRepository.findById(inviteId)
                .filter(i -> i.getCohortId().equals(principal.cohortId()))
                .orElseThrow(() -> new ResourceNotFoundException("招待が見つかりません"));
        if (invite.getRevokedAt() == null) {
            invite.setRevokedAt(OffsetDateTime.now());
        }
    }

    /**
     * 登録時にコードを検証し原子的に消費する。無効（未存在/失効/期限切れ/枠超過）はすべて 400 で
     * 同一メッセージ（どの条件かを漏らさない）。成功時は登録先 cohortId と targetRole を返す。
     */
    @Transactional
    public Consumed validateAndConsume(String rawCode) {
        CohortInvite invite = inviteRepository.findByCodeHash(codeGenerator.hash(rawCode))
                .orElseThrow(() -> new InvalidRequestException("招待コードが無効です"));
        int consumed = inviteRepository.tryConsume(invite.getId(), OffsetDateTime.now());
        if (consumed == 0) {
            throw new InvalidRequestException("招待コードが無効です");
        }
        return new Consumed(invite.getCohortId(), invite.getTargetRole());
    }

    /** 発行結果（生コードは 1 度だけ返す）。 */
    public record Issued(CohortInvite invite, String rawCode) {
    }

    /** 消費結果（登録時に適用する cohort と role）。 */
    public record Consumed(Long cohortId, UserRole targetRole) {
    }
}
