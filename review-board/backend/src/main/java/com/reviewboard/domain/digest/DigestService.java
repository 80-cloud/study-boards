package com.reviewboard.domain.digest;

import com.reviewboard.domain.cohort.Cohort;
import com.reviewboard.domain.cohort.CohortRepository;
import com.reviewboard.domain.notification.NotificationRepository;
import com.reviewboard.domain.notificationpref.NotificationPrefService;
import com.reviewboard.domain.notificationpref.dto.NotificationPrefResponse;
import com.reviewboard.domain.post.PostRepository;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import com.reviewboard.domain.user.UserStatus;
import com.reviewboard.mail.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 週次ダイジェスト（Issue #233・C-5）。過疎化対策の能動チャネル。
 *
 * <p>cohort ごとに「未レビュー成果物（review_count=0）」を集計し、opt-in（weekly_digest かつ
 * email_enabled）かつ有効な受講生へ MailService で送る。cohort 境界を越えない。
 * 送る中身（未レビュー or 未読）が無いユーザーには送らない（空メールを出さない）。
 */
@Service
public class DigestService {

    private static final Logger log = LoggerFactory.getLogger(DigestService.class);

    private final CohortRepository cohortRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPrefService prefService;
    private final MailService mailService;
    private final String appName;

    public DigestService(CohortRepository cohortRepository, UserRepository userRepository,
                         PostRepository postRepository, NotificationRepository notificationRepository,
                         NotificationPrefService prefService, MailService mailService,
                         @Value("${app.name:レビューラボ}") String appName) {
        this.cohortRepository = cohortRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.notificationRepository = notificationRepository;
        this.prefService = prefService;
        this.mailService = mailService;
        this.appName = appName;
    }

    /**
     * 全 cohort の週次ダイジェストを送る。メール無効時は何もしない。
     *
     * @return 送信したメール件数（テスト・運用ログ用）
     */
    @Transactional(readOnly = true)
    public int sendWeeklyDigests() {
        if (!mailService.enabled()) {
            log.debug("mail disabled; skip weekly digest");
            return 0;
        }
        int sent = 0;
        for (Cohort cohort : cohortRepository.findAll()) {
            int unreviewed = postRepository
                    .countByCohortIdAndDeletedAtIsNullAndReviewCount(cohort.getId(), 0);
            List<User> members = userRepository.findByCohortIdAndStatus(cohort.getId(), UserStatus.ACTIVE);
            if (members.isEmpty()) {
                continue;
            }
            Map<Long, NotificationPrefResponse> prefs =
                    prefService.effectivePrefs(members.stream().map(User::getId).toList());
            for (User m : members) {
                if (!shouldSendDigest(prefs.get(m.getId()))) {
                    continue;
                }
                int unread = notificationRepository.countByRecipientUserIdAndReadAtIsNull(m.getId());
                if (unreviewed == 0 && unread == 0) {
                    continue; // 知らせる中身が無ければ送らない
                }
                mailService.send(m.getEmail(), subject(), buildBody(appName, m.getDisplayName(),
                        unreviewed, unread, mailService.baseUrl()));
                sent++;
            }
        }
        log.info("weekly digest sent count={}", sent);
        return sent;
    }

    /** opt-in 判定（純粋関数）：メール ON かつ 週次ダイジェスト ON のときだけ送る。 */
    static boolean shouldSendDigest(NotificationPrefResponse pref) {
        return pref != null && pref.emailEnabled() && pref.weeklyDigest();
    }

    private String subject() {
        return "【" + appName + "】今週のレビュー状況";
    }

    /** ダイジェスト本文（純粋関数・単体テスト対象）。 */
    static String buildBody(String appName, String displayName, int unreviewed, int unread, String baseUrl) {
        StringBuilder sb = new StringBuilder();
        sb.append(displayName).append(" さん\n\n");
        sb.append("今週のレビュー状況をお届けします。\n\n");
        if (unreviewed > 0) {
            sb.append("・まだレビューが付いていない成果物が ").append(unreviewed).append(" 件あります。\n");
            sb.append("  レビューを送って仲間の成長を後押ししましょう。\n");
        }
        if (unread > 0) {
            sb.append("・未読の通知が ").append(unread).append(" 件あります。\n");
        }
        if (baseUrl != null && !baseUrl.isBlank()) {
            sb.append("\n").append(baseUrl).append("\n");
        }
        sb.append("\n— ").append(appName);
        return sb.toString();
    }
}
