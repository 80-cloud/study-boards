package com.reviewboard.domain.user;

/**
 * ロール（RBAC・要件定義書 §3-2）。
 * 講師（TEACHER）のみが成果物の最終評価・承認（F-EVAL-01）を行える。
 * 将来 ADMIN / MODERATOR を追加できる設計。
 */
public enum UserRole {
    STUDENT,
    TEACHER
}
