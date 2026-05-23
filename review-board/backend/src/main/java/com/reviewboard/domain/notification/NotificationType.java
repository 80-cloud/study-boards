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
    MENTIONED,
    /** 自分の投稿に講師の評価（合格/差し戻し）が付いた（投稿者へ） */
    EVALUATION_RESULT,
    /** 自分のレビューに返信が付いた（レビュアーへ） */
    REPLY_RECEIVED,
    /** 投稿者が対応状態を「再レビュー依頼」にした（レビュアーへ） */
    RE_REVIEW_REQUESTED,
    /** 自分のレビューがベストレビューに選ばれた（レビュアーへ） */
    BEST_REVIEW_SELECTED
}
