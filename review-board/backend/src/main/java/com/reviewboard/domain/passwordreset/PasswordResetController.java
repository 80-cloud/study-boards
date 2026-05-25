package com.reviewboard.domain.passwordreset;

import com.reviewboard.domain.passwordreset.dto.PasswordResetConfirmRequest;
import com.reviewboard.domain.passwordreset.dto.PasswordResetRequestRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * パスワードリセット API（Issue #231・B-4・公開エンドポイント）。
 *
 * <p>request は email 列挙を防ぐため、ユーザーの有無にかかわらず常に 204 を返す。
 * confirm はトークン検証に失敗すると 400（{@code InvalidRequestException}）。
 */
@RestController
@RequestMapping("/api/auth/password-reset")
public class PasswordResetController {

    private final PasswordResetService service;

    public PasswordResetController(PasswordResetService service) {
        this.service = service;
    }

    /** リセット要求。存在を漏らさないため常に 204（メール送信の有無で挙動を変えない）。 */
    @PostMapping("/request")
    public ResponseEntity<Void> request(@Valid @RequestBody PasswordResetRequestRequest body) {
        service.request(body.email());
        return ResponseEntity.noContent().build();
    }

    /** リセット確定。成功で 204、無効/期限切れ/使用済みトークンは 400。 */
    @PostMapping("/confirm")
    public ResponseEntity<Void> confirm(@Valid @RequestBody PasswordResetConfirmRequest body) {
        service.confirm(body.token(), body.password());
        return ResponseEntity.noContent().build();
    }
}
