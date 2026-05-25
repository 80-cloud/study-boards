package com.reviewboard.domain.mfa;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.mfa.dto.MfaCodeRequest;
import com.reviewboard.domain.mfa.dto.MfaSetupResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
        return new MfaSetupResponse(result.secret(), result.qrDataUri());
    }

    /** 有効化：認証アプリのコードで pending シークレットを検証する。 */
    @PostMapping("/enable")
    public ResponseEntity<Void> enable(@AuthenticationPrincipal AuthPrincipal principal,
                                       @Valid @RequestBody MfaCodeRequest body) {
        mfaService.enable(principal.userId(), body.code());
        return ResponseEntity.noContent().build();
    }

    /** 無効化：現在のコードで本人確認してから無効化する。 */
    @PostMapping("/disable")
    public ResponseEntity<Void> disable(@AuthenticationPrincipal AuthPrincipal principal,
                                        @Valid @RequestBody MfaCodeRequest body) {
        mfaService.disable(principal.userId(), body.code());
        return ResponseEntity.noContent().build();
    }
}
