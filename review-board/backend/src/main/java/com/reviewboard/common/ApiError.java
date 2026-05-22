package com.reviewboard.common;

/**
 * エラーレスポンス共通フォーマット（機能一覧.md §共通仕様）。
 * 例: {@code { "error": { "code": "FORBIDDEN", "message": "..." } } }
 */
public record ApiError(ErrorBody error) {

    public record ErrorBody(String code, String message) {}

    public static ApiError of(String code, String message) {
        return new ApiError(new ErrorBody(code, message));
    }
}
