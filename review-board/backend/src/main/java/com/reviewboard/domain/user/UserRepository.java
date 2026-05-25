package com.reviewboard.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /** アカウント発行時の重複チェック（email は unique）。 */
    boolean existsByEmail(String email);

    /** 初期管理者 bootstrap の冪等判定（ADMIN が既に居れば作成しない）。 */
    boolean existsByRole(UserRole role);

    /** cohort 境界での取得（IDOR 防止。プロフィール閲覧は同 cohort のみ） */
    Optional<User> findByIdAndCohortId(Long id, Long cohortId);

    /** メンション解決用：同 cohort の全メンバー（越境メンションを防ぐ） */
    List<User> findByCohortId(Long cohortId);

    /** 週次ダイジェスト（C-5・#233）：同 cohort の有効ユーザーのみ（無効化済みには送らない）。 */
    List<User> findByCohortIdAndStatus(Long cohortId, UserStatus status);
}
