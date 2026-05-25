package com.reviewboard.domain.mfa;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 二要素認証（TOTP）の登録・有効化・無効化（Issue #235・C-6）。
 *
 * <p>フロー：
 *  <ol>
 *    <li>{@link #setup}：シークレットを発行して保存（pending・mfa_enabled=false）。QR を返す。</li>
 *    <li>{@link #enable}：認証アプリのコードで pending シークレットを検証し、有効化する。</li>
 *    <li>{@link #disable}：コード検証のうえ無効化し、シークレットを破棄する。</li>
 *  </ol>
 */
@Service
public class MfaService {

    private final UserRepository userRepository;
    private final TotpService totpService;
    private final RecoveryCodeService recoveryCodeService;
    private final SecretCipher secretCipher;

    public MfaService(UserRepository userRepository, TotpService totpService,
                      RecoveryCodeService recoveryCodeService, SecretCipher secretCipher) {
        this.userRepository = userRepository;
        this.totpService = totpService;
        this.recoveryCodeService = recoveryCodeService;
        this.secretCipher = secretCipher;
    }

    /** TOTP セットアップ開始。新しいシークレットを保存（pending）し、認証アプリ取り込み用の情報を返す。 */
    @Transactional
    public SetupResult setup(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        if (user.isMfaEnabled()) {
            // 既に有効。二重 setup は禁止（まず disable させる）。
            throw new InvalidRequestException("二要素認証は既に有効です");
        }
        String secret = totpService.generateSecret();
        // #249 at-rest 暗号化：DB には暗号文（v1:...）で保存。QR には生シークレットを内包する。
        user.setTotpSecret(secretCipher.encrypt(secret));
        user.setMfaEnabled(false);
        user.setUpdatedAt(OffsetDateTime.now());
        // 生シークレットは返さず QR にのみ内包する（取り込みは QR スキャン一本化・#239）。
        return new SetupResult(totpService.qrDataUri(secret, user.getEmail()));
    }

    /**
     * pending シークレットをコードで検証し、有効化する。コード不一致は 400。
     * 有効化と同時にリカバリコードを発行し、生コードを1度だけ返す（端末紛失時の自己復旧手段・#241）。
     */
    @Transactional
    public List<String> enable(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        if (user.isMfaEnabled()) {
            throw new InvalidRequestException("二要素認証は既に有効です");
        }
        if (user.getTotpSecret() == null) {
            throw new InvalidRequestException("先に二要素認証のセットアップを開始してください");
        }
        if (!totpService.verify(secretCipher.decrypt(user.getTotpSecret()), code)) {
            throw new InvalidRequestException("コードが正しくありません");
        }
        user.setMfaEnabled(true);
        user.setUpdatedAt(OffsetDateTime.now());
        return recoveryCodeService.regenerate(userId);
    }

    /**
     * 無効化。現在のコードで本人確認してから secret を破棄する。コード不一致は 400。
     * リカバリコードも全削除する（孤児を残さない・#241）。
     */
    @Transactional
    public void disable(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        if (!user.isMfaEnabled()) {
            throw new InvalidRequestException("二要素認証は有効になっていません");
        }
        if (!totpService.verify(secretCipher.decrypt(user.getTotpSecret()), code)) {
            throw new InvalidRequestException("コードが正しくありません");
        }
        user.setMfaEnabled(false);
        user.setTotpSecret(null);
        user.setUpdatedAt(OffsetDateTime.now());
        recoveryCodeService.deleteAll(userId);
    }

    /**
     * リカバリコードの再生成（#241）。現在の TOTP コードで本人確認してから旧コードを全破棄し、新規発行する。
     * MFA 無効時・コード不一致は 400。
     *
     * @return 新しい生コード（1度だけ返す）
     */
    @Transactional
    public List<String> regenerateRecoveryCodes(Long userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("authenticated user not found"));
        if (!user.isMfaEnabled()) {
            throw new InvalidRequestException("二要素認証は有効になっていません");
        }
        if (!totpService.verify(secretCipher.decrypt(user.getTotpSecret()), code)) {
            throw new InvalidRequestException("コードが正しくありません");
        }
        return recoveryCodeService.regenerate(userId);
    }

    /** 未使用リカバリコードの残数（MFA 有効時のみ意味を持つ）。 */
    public long remainingRecoveryCodes(Long userId) {
        return recoveryCodeService.remaining(userId);
    }

    /** setup の戻り（QR data URI のみ。生シークレットは外に出さない）。 */
    public record SetupResult(String qrDataUri) {
    }
}
