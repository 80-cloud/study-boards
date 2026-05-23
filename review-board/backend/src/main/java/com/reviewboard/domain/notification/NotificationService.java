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

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
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
            return NotificationResponse.from(n, actor != null ? actor.getDisplayName() : "(不明)");
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
