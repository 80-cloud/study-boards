package com.reviewboard.domain.user;

/** ユーザーの有効状態。DISABLED はログイン不可（kick・#229）。DELETED は退会（論理削除＋匿名化・#263）。 */
public enum UserStatus {
    ACTIVE,
    DISABLED,
    DELETED
}
