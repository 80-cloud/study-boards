package com.reviewboard.domain.mfa;

import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.util.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * TOTP（RFC 6238）の生成・QR・検証（Issue #235・C-6）。ライブラリ {@code dev.samstevens.totp} の薄いラッパ。
 *
 * <p>シークレットは Base32。検証は前後 1 ステップ（±30 秒）の時刻ずれを許容する。
 */
@Service
public class TotpService {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final QrGenerator qrGenerator = new ZxingPngQrGenerator();
    private final CodeVerifier codeVerifier;
    /** otpauth ラベルの issuer（認証アプリ上の表示名）。アプリ名に追従。 */
    private final String issuer;

    public TotpService(@Value("${app.name:レビューラボ}") String issuer) {
        this.issuer = issuer;
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
        verifier.setAllowedTimePeriodDiscrepancy(1); // ±1 ステップ（時刻ずれ許容）
        this.codeVerifier = verifier;
    }

    /** 新しい Base32 シークレットを生成する（setup 時に1度だけ）。 */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /** 認証アプリ取り込み用の QR を data URI（PNG）で返す。 */
    public String qrDataUri(String secret, String accountLabel) {
        try {
            byte[] png = qrGenerator.generate(qrData(secret, accountLabel));
            return Utils.getDataUriForImage(png, qrGenerator.getImageMimeType());
        } catch (QrGenerationException e) {
            throw new IllegalStateException("QR 生成に失敗しました", e);
        }
    }

    /**
     * QR と同じ内容の otpauth:// URI を返す（#237）。カメラの無いユーザーが、対応する認証アプリ
     * （デスクトップ版 1Password / Bitwarden 等）へ手入力でなく貼り付けで取り込めるようにする。
     */
    public String otpauthUri(String secret, String accountLabel) {
        return qrData(secret, accountLabel).getUri();
    }

    private QrData qrData(String secret, String accountLabel) {
        return new QrData.Builder()
                .label(accountLabel)
                .secret(secret)
                .issuer(issuer)
                .algorithm(dev.samstevens.totp.code.HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
    }

    /** コードがシークレットに対して有効か（時刻ずれを許容）。secret/ code が null/空なら false。 */
    public boolean verify(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null || code.isBlank()) {
            return false;
        }
        return codeVerifier.isValidCode(secret, code.trim());
    }
}
