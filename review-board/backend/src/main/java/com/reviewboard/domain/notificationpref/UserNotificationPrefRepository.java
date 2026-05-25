package com.reviewboard.domain.notificationpref;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserNotificationPrefRepository extends JpaRepository<UserNotificationPref, Long> {

    Optional<UserNotificationPref> findByUserId(Long userId);

    /** 週次ダイジェストのバッチ用：対象ユーザー群の設定をまとめ引き（行が無い＝既定 ON）。 */
    List<UserNotificationPref> findByUserIdIn(Collection<Long> userIds);
}
