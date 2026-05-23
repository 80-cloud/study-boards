package com.reviewboard.domain.user;

/**
 * ロール（RBAC・要件定義書 §3-2）。
 * 講師（TEACHER）のみが成果物の最終評価・承認（F-EVAL-01）を行える。
 * ADMIN は運用管理（cohort 作成・アカウント発行）専用で、レビュー業務には関与しない。
 */
public enum UserRole {
    STUDENT,
    TEACHER,
    ADMIN
}
