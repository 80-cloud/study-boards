package com.reviewboard.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** 受信者の通知一覧（新着順）。 */
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId);

    /** 未読件数（ベルのバッジ用・ポーリングで頻繁に叩くため軽量）。 */
    int countByRecipientUserIdAndReadAtIsNull(Long recipientUserId);

    /** 単体取得（既読化の所有者検証に使う）。 */
    Optional<Notification> findByIdAndRecipientUserId(Long id, Long recipientUserId);

    /** 受信者の未読をまとめて既読化。 */
    @Modifying
    @Query("update Notification n set n.readAt = :now "
            + "where n.recipientUserId = :recipientUserId and n.readAt is null")
    int markAllRead(@Param("recipientUserId") Long recipientUserId, @Param("now") OffsetDateTime now);
}
