package com.reviewboard.domain.notification;

/**
 * F-NOTIF-01 通知の種別（要件§5）。リアルタイムは使わずポーリングで配信する。
 */
public enum NotificationType {
    /** 自分の投稿にレビューが付いた（投稿者へ） */
    REVIEW_RECEIVED,
    /** 自分のレビューにありがとうが付いた（レビュアーへ） */
    THANKS_RECEIVED,
    /** レビュー本文・返信で @表示名 で名指しされた（メンションされた人へ） */
    MENTIONED
}
