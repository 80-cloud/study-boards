package com.reviewboard.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** reuse 検知時：当該ユーザーの未失効トークンを一括失効（盗用への防御・共通設計方針） */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.userId = :userId AND r.revokedAt IS NULL")
    int revokeAllActiveByUserId(@Param("userId") Long userId, @Param("now") OffsetDateTime now);
}
