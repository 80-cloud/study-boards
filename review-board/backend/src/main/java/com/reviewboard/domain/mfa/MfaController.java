package com.reviewboard.domain.mfa;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.mfa.dto.MfaCodeRequest;
import com.reviewboard.domain.mfa.dto.MfaRecoveryCodesResponse;
import com.reviewboard.domain.mfa.dto.MfaRecoveryStatusResponse;
import com.reviewboard.domain.mfa.dto.MfaSetupResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 二要素認証（TOTP）の設定 API（Issue #235・C-6）。★認証必須＝常に自分のアカウントの MFA を操作する。
 */
@RestController
@RequestMapping("/api/auth/mfa")
public class MfaController {

    private final MfaService mfaService;

    public MfaController(MfaService mfaService) {
        this.mfaService = mfaService;
    }

    /** セットアップ開始：シークレット発行（pending）＋ QR を返す。 */
    @PostMapping("/setup")
    public MfaSetupResponse setup(@AuthenticationPrincipal AuthPrincipal principal) {
        MfaService.SetupResult result = mfaService.setup(principal.userId());
        return new MfaSetupResponse(result.qrDataUri());
    }

    /**
     * 有効化：認証アプリのコードで pending シークレットを検証する。
     * 成功時、リカバリコード（生）を1度だけ返す（#241・端末紛失時の自己復旧手段）。
     */
    @PostMapping("/enable")
    public MfaRecoveryCodesResponse enable(@AuthenticationPrincipal AuthPrincipal principal,
                                           @Valid @RequestBody MfaCodeRequest body) {
        return new MfaRecoveryCodesResponse(mfaService.enable(principal.userId(), body.code()));
    }

    /** 無効化：現在のコードで本人確認してから無効化する（リカバリコードも全削除）。 */
    @PostMapping("/disable")
    public ResponseEntity<Void> disable(@AuthenticationPrincipal AuthPrincipal principal,
                                        @Valid @RequestBody MfaCodeRequest body) {
        mfaService.disable(principal.userId(), body.code());
        return ResponseEntity.noContent().build();
    }

    /** リカバリコードの残数（#241）。MFA 有効時のみ意味を持つ。 */
    @GetMapping("/recovery-codes")
    public MfaRecoveryStatusResponse recoveryStatus(@AuthenticationPrincipal AuthPrincipal principal) {
        return new MfaRecoveryStatusResponse(
                mfaService.remainingRecoveryCodes(principal.userId()),
                RecoveryCodeService.LOW_REMAINING_THRESHOLD);
    }

    /**
     * リカバリコードの再生成（#241）。現在の TOTP コードで本人確認し、旧コードを全破棄して新規発行する。
     * 新しい生コードを1度だけ返す。
     */
    @PostMapping("/recovery-codes/regenerate")
    public MfaRecoveryCodesResponse regenerateRecoveryCodes(@AuthenticationPrincipal AuthPrincipal principal,
                                                            @Valid @RequestBody MfaCodeRequest body) {
        return new MfaRecoveryCodesResponse(
                mfaService.regenerateRecoveryCodes(principal.userId(), body.code()));
    }
}
