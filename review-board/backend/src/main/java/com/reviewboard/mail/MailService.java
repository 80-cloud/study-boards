package com.reviewboard.mail;

import com.reviewboard.config.MailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * メール送信（#175・過疎化対策の外向きチャネル）。
 *
 * <p>設計方針：
 *  - {@code app.mail.enabled=false}（既定）では実送信せずログのみ（dev/CI/SMTP 未設定でも安全）。
 *  - 送信は {@link Async}＝ドメイン処理のリクエストをブロックしない。呼び出しは TX コミット後の通知生成からで、
 *    例外は内部で握りつぶす（メール失敗が業務処理を巻き戻さない・通知本体は残す）。
 *  - 本文・宛先は呼び出し側が文字列で渡す（lazy ロードや TX 依存を持ち込まない）。
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final MailProperties props;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public MailService(MailProperties props, ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.props = props;
        this.mailSenderProvider = mailSenderProvider;
    }

    /** プレーンテキストメールを送る。無効時は no-op、失敗時はログのみ（例外を投げない）。 */
    @Async
    public void send(String to, String subject, String body) {
        if (!props.enabled()) {
            log.debug("mail disabled; skip send to={} subject={}", to, subject);
            return;
        }
        if (to == null || to.isBlank()) {
            return;
        }
        try {
            JavaMailSender sender = mailSenderProvider.getIfAvailable();
            if (sender == null) {
                log.warn("app.mail.enabled=true だが JavaMailSender が無い。spring.mail.* を設定してください。");
                return;
            }
            SimpleMailMessage msg = new SimpleMailMessage();
            if (props.from() != null && !props.from().isBlank()) {
                msg.setFrom(props.from());
            }
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            sender.send(msg);
            log.info("mail sent to={} subject={}", to, subject);
        } catch (Exception e) {
            // メール失敗は通知本体に影響させない（過疎化対策の付帯機能・ベストエフォート）。
            log.warn("mail send failed to={} subject={}: {}", to, subject, e.toString());
        }
    }

    /** 実送信が有効か（呼び出し側が無駄な本文組み立て/DB 取得を避けるために使う）。 */
    public boolean enabled() {
        return props.enabled();
    }

    /** メール本文中のリンク用ベース URL（未設定なら相対導線のみ）。 */
    public String baseUrl() {
        return props.baseUrl() != null ? props.baseUrl() : "";
    }
}
