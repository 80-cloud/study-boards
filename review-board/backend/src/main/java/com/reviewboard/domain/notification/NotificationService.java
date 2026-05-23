package com.reviewboard.domain.notification;

import com.reviewboard.common.ResourceNotFoundException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.notification.dto.NotificationResponse;
import com.reviewboard.domain.user.User;
import com.reviewboard.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * F-NOTIF-01 通知のユースケース。★S軸：閲覧・既読化は受信者本人のものに限る（他人の通知は 404）。
 *
 * <p>生成（{@link #notify}）はレビュー作成・ありがとう等のドメイン処理から同一 TX で呼ばれる。
 * 自分が自分に通知することはしない（recipient == actor はスキップ）。
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final com.reviewboard.storage.StorageService storageService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               com.reviewboard.storage.StorageService storageService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    /**
     * 通知を1件作る。recipient と actor が同一なら作らない（自己通知の抑止）。
     * 呼び出し元の TX に参加する（レビュー作成・ありがとうと原子的に確定）。
     */
    @Transactional
    public void notify(Long recipientUserId, Long actorUserId, NotificationType type,
                       Long postId, Long reviewId) {
        if (recipientUserId == null || recipientUserId.equals(actorUserId)) {
            return;
        }
        Notification n = new Notification();
        n.setRecipientUserId(recipientUserId);
        n.setActorUserId(actorUserId);
        n.setType(type);
        n.setPostId(postId);
        n.setReviewId(reviewId);
        n.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(n);
    }

    /**
     * F-MENTION：本文に含まれる `@表示名`（同 cohort メンバー）を解決し、その人へ MENTION 通知を作る。
     * cohort メンバーのみ走査するため越境メンションは起きない。自己メンションは notify がスキップ。
     * 表示名の完全一致（クローズドな少人数 cohort 前提・衝突時は該当者全員に通知）。
     */
    @Transactional
    public void notifyMentions(String text, Long actorUserId, Long cohortId, Long postId, Long reviewId) {
        if (text == null || text.indexOf('@') < 0) {
            return;
        }
        for (User member : userRepository.findByCohortId(cohortId)) {
            if (text.contains("@" + member.getDisplayName())) {
                notify(member.getId(), actorUserId, NotificationType.MENTIONED, postId, reviewId);
            }
        }
    }

    /** 自分の通知一覧（新着順）。actor 名は N+1 回避でまとめ引き。 */
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(AuthPrincipal principal) {
        List<Notification> items = notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(principal.userId());
        if (items.isEmpty()) {
            return List.of();
        }
        Set<Long> actorIds = items.stream().map(Notification::getActorUserId).collect(Collectors.toSet());
        Map<Long, User> actors = userRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return items.stream().map(n -> {
            User actor = actors.get(n.getActorUserId());
            return NotificationResponse.from(n,
                    actor != null ? actor.getDisplayName() : "(不明)",
                    actor != null ? storageService.presignedGetUrl(actor.getAvatarKey()) : null);
        }).toList();
    }

    /** 未読件数（ベルのバッジ用・ポーリングで頻繁に叩く軽量 API）。 */
    @Transactional(readOnly = true)
    public int unreadCount(AuthPrincipal principal) {
        return notificationRepository.countByRecipientUserIdAndReadAtIsNull(principal.userId());
    }

    /** 1件を既読化。自分の通知でなければ 404（存在を漏らさない）。 */
    @Transactional
    public void markRead(AuthPrincipal principal, Long id) {
        Notification n = notificationRepository.findByIdAndRecipientUserId(id, principal.userId())
                .orElseThrow(() -> new ResourceNotFoundException("notification not found: " + id));
        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now());
        }
    }

    /** 自分の未読をすべて既読化。 */
    @Transactional
    public void markAllRead(AuthPrincipal principal) {
        notificationRepository.markAllRead(principal.userId(), OffsetDateTime.now());
    }
}
