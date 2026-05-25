package com.reviewboard.mail;

import com.reviewboard.config.MailProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * MailService の境界（#175）。Spring を起動しない純粋単体（@Async は直接 new では効かず同期実行）。
 * ★方針の検証：無効時は no-op／有効時のみ送信／sender 不在・送信失敗でも例外を投げない。
 */
class MailServiceTest {

    @SuppressWarnings("unchecked")
    private ObjectProvider<JavaMailSender> providerOf(JavaMailSender sender) {
        ObjectProvider<JavaMailSender> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(sender);
        return p;
    }

    @Test
    void disabled_does_not_send() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MailService svc = new MailService(new MailProperties(false, "from@x", ""), providerOf(sender));

        svc.send("to@x", "subj", "body");

        verifyNoInteractions(sender);
    }

    @Test
    void enabled_sends_with_from_and_fields() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MailService svc = new MailService(new MailProperties(true, "from@x", "https://app"), providerOf(sender));

        svc.send("to@x", "件名", "本文");

        SimpleMailMessage expected = new SimpleMailMessage();
        expected.setFrom("from@x");
        expected.setTo("to@x");
        expected.setSubject("件名");
        expected.setText("本文");
        verify(sender).send(expected);
    }

    @Test
    void enabled_but_no_sender_does_not_throw() {
        MailService svc = new MailService(new MailProperties(true, "from@x", ""), providerOf(null));
        assertThatCode(() -> svc.send("to@x", "s", "b")).doesNotThrowAnyException();
    }

    @Test
    void send_failure_is_swallowed() {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new RuntimeException("smtp down")).when(sender).send(any(SimpleMailMessage.class));
        MailService svc = new MailService(new MailProperties(true, "from@x", ""), providerOf(sender));

        // メール失敗は業務処理を巻き戻さない＝例外を投げないこと。
        assertThatCode(() -> svc.send("to@x", "s", "b")).doesNotThrowAnyException();
    }

    @Test
    void blank_recipient_is_skipped() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MailService svc = new MailService(new MailProperties(true, "from@x", ""), providerOf(sender));

        svc.send("", "s", "b");

        verifyNoInteractions(sender);
    }
}
