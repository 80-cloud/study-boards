package com.reviewboard.domain.auth;

/**
 * ログイン認証失敗。ユーザー存在を漏らさない汎用エラー（列挙攻撃対策・画面設計書 S-01）。
 * 401 に倒す。
 */
public class BadCredentialsException extends RuntimeException {
    public BadCredentialsException() {
        super("メールアドレスまたはパスワードが正しくありません");
    }
}
