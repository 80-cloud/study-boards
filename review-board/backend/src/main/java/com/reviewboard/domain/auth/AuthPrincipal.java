package com.reviewboard.domain.auth;

import com.reviewboard.domain.user.UserRole;

/**
 * 認証済みユーザーの最小情報。SecurityContext の principal として保持し、
 * 各サービスが cohort 境界・所有者・ロールを判定するために使う（★S軸）。
 * クライアント入力ではなく、検証済み access トークンから導出する。
 */
public record AuthPrincipal(Long userId, Long cohortId, UserRole role) {
}
