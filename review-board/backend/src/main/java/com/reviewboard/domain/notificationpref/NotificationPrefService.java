package com.reviewboard.domain.notificationpref;

import com.reviewboard.domain.notificationpref.dto.NotificationPrefResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * 通知設定の取得・更新（Issue #233・C-5）。
 *
 * <p>★方針：行が無いユーザーは「既定（全 ON）」。opt-out したときだけ行を upsert する。
 * これにより全ユーザーの backfill を避けつつ「未設定＝従来どおり受け取る」を保つ。
 */
@Service
public class NotificationPrefService {

    private final UserNotificationPrefRepository repository;

    public NotificationPrefService(UserNotificationPrefRepository repository) {
        this.repository = repository;
    }

    /** 自分の設定を返す（行が無ければ既定）。 */
    @Transactional(readOnly = true)
    public NotificationPrefResponse get(Long userId) {
        return repository.findByUserId(userId)
                .map(NotificationPrefResponse::from)
                .orElseGet(NotificationPrefResponse::defaults);
    }

    /** 自分の設定を upsert する。 */
    @Transactional
    public NotificationPrefResponse update(Long userId, boolean emailEnabled, boolean weeklyDigest) {
        UserNotificationPref pref = repository.findByUserId(userId).orElseGet(() -> {
            UserNotificationPref p = new UserNotificationPref();
            p.setUserId(userId);
            return p;
        });
        pref.setEmailEnabled(emailEnabled);
        pref.setWeeklyDigest(weeklyDigest);
        pref.setUpdatedAt(OffsetDateTime.now());
        repository.save(pref);
        return NotificationPrefResponse.from(pref);
    }

    /** 個別の外向きメール（レビュー受領など）を送ってよいか。行が無ければ既定 ON。 */
    @Transactional(readOnly = true)
    public boolean isEmailEnabled(Long userId) {
        return repository.findByUserId(userId).map(UserNotificationPref::isEmailEnabled).orElse(true);
    }

    /**
     * バッチ用：対象ユーザー群について「(email_enabled, weekly_digest)」の実効値を返す。
     * 行が無いユーザーは既定（true,true）で埋める。N+1 を避けてまとめ引きする。
     */
    @Transactional(readOnly = true)
    public Map<Long, NotificationPrefResponse> effectivePrefs(Collection<Long> userIds) {
        Map<Long, NotificationPrefResponse> result = new HashMap<>();
        for (Long id : userIds) {
            result.put(id, NotificationPrefResponse.defaults());
        }
        for (UserNotificationPref pref : repository.findByUserIdIn(userIds)) {
            result.put(pref.getUserId(), NotificationPrefResponse.from(pref));
        }
        return result;
    }
}
