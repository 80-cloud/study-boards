package com.reviewboard.domain.passwordreset;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserStatus;
import com.reviewboard.mail.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * パスワードリセット（Issue #231・B-4）。自己回復フローのオーケストレーション。
 *
 * <p>セキュリティ（S軸）：
 *  <ul>
 *    <li>生トークンはメールにのみ載せ、DB は SHA-256 ハッシュのみ保持（refresh / invite と同方針）。</li>
 *    <li>request は <b>存在を漏らさず常に成功扱い</b>（email 列挙を防ぐ）。送信有無で挙動を変えない。</li>
 *    <li>confirm は 1 度きり：期限切れ・使用済み・未知トークンはすべて 400（区別しない）。</li>
 *    <li>新パスワード設定時、当該ユーザーの未使用トークンを一括無効化（旧リンク失効）。</li>
 *  </ul>
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final PasswordResetTokenRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final long ttlSeconds;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(PasswordResetTokenRepository repository, UserRepository userRepository,
                                PasswordEncoder passwordEncoder, MailService mailService,
                                PasswordResetProperties props) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.ttlSeconds = props.ttlSeconds();
    }

    /**
     * リセット要求。email に紐づくユーザーがいればトークンを発行してメール送信する。
     * 存在しない／無効化済みでも黙って何もしない（列挙防止のため呼び出し側は常に 200 を返す）。
     */
    @Transactional
    public void request(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            // 無効化（kick・#229）済みアカウントには発行しない（復活経路にしない）。
            if (user.getStatus() == UserStatus.DISABLED) {
                return;
            }
            // 旧リンクは無効化してから新規発行（同時に複数の有効リンクを残さない）。
            OffsetDateTime now = OffsetDateTime.now();
            repository.invalidateActiveByUserId(user.getId(), now);

            String raw = randomToken();
            PasswordResetToken token = new PasswordResetToken();
            token.setUserId(user.getId());
            token.setTokenHash(sha256(raw));
            token.setCreatedAt(now);
            token.setExpiresAt(now.plusSeconds(ttlSeconds));
            repository.save(token);

            sendMail(user, raw);
        });
    }

    /**
     * リセット確定。トークンを検証し、有効なら bcrypt で更新してトークンを消費する。
     *
     * @throws InvalidRequestException 未知／期限切れ／使用済みトークン（区別せず 400）
     */
    @Transactional
    public void confirm(String rawToken, String newRawPassword) {
        PasswordResetToken token = repository.findByTokenHash(sha256(rawToken))
                .orElseThrow(() -> new InvalidRequestException("リンクが無効か、有効期限が切れています"));

        OffsetDateTime now = OffsetDateTime.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw new InvalidRequestException("リンクが無効か、有効期限が切れています");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new InvalidRequestException("リンクが無効か、有効期限が切れています"));

        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        user.setUpdatedAt(now);
        token.setUsedAt(now);
    }

    private void sendMail(User user, String rawToken) {
        String base = mailService.baseUrl();
        String link = (base == null || base.isBlank())
                ? "/password-reset?token=" + rawToken
                : base + "/password-reset?token=" + rawToken;
        String body = """
                %s 様

                パスワード再設定のリクエストを受け付けました。
                以下のリンクから新しいパスワードを設定してください（有効期限: 約%d分）。

                %s

                心当たりがない場合は、このメールを破棄してください。
                """.formatted(user.getDisplayName(), ttlSeconds / 60, link);
        // MailService は app.mail.enabled=false なら no-op（ログのみ）。失敗は内部で握りつぶす。
        mailService.send(user.getEmail(), "【レビューラボ】パスワード再設定のご案内", body);
        log.debug("password reset token issued userId={}", user.getId());
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash); // 64 文字 hex（password_reset_tokens.token_hash CHAR(64)）
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
