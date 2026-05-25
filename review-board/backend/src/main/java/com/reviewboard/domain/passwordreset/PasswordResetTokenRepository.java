package com.reviewboard.domain.passwordreset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** 新規発行前に、当該ユーザーの未使用トークンをまとめて消費扱いにする（旧リンクの無効化）。 */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.userId = :userId AND t.usedAt IS NULL")
    int invalidateActiveByUserId(@Param("userId") Long userId, @Param("now") OffsetDateTime now);
}
