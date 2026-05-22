package com.reviewboard.common;

/**
 * ビジネスルール違反（400）。バリデーション（@Valid）では表現しきれない不正リクエスト用。
 * 例：自分の投稿への自己レビュー、同じ観点軸の重複コメント。
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
