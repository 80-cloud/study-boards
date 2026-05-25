package com.reviewboard.domain.notificationpref;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * ユーザーごとの通知設定（Issue #233・C-5）。
 *
 * <p>行が無いユーザーは「既定（全 ON）」として扱う（opt-out したときだけ行を作る）。
 * したがって本エンティティが存在する＝何らかを明示設定した状態。
 */
@Entity
@Table(name = "user_notification_prefs")
@Getter
@Setter
@NoArgsConstructor
public class UserNotificationPref {

    /** users.id と 1:1（PK 兼 FK）。 */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** 個別の外向きメール（レビュー受領など）の ON/OFF。 */
    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled = true;

    /** 週次ダイジェスト（未レビュー成果物の掘り起こし）の ON/OFF。 */
    @Column(name = "weekly_digest", nullable = false)
    private boolean weeklyDigest = true;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
