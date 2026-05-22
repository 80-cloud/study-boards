package com.reviewboard.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 例外 → 共通エラーレスポンスの変換（機能一覧.md §共通仕様）。
 *
 * <p>S軸の方針：認可失敗は 403、未認証は 401、リソース無し/他 cohort は 404（存在を漏らさず IDOR 遮断）。
 * 個別ドメインの NotFound 例外は後続 feature PR で追加し、ここに 404 マッピングを足す。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** バリデーション（400） */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .orElse("入力内容を確認してください");
        return ResponseEntity.badRequest().body(ApiError.of("VALIDATION_ERROR", msg));
    }

    /** 認可不可（403）：ロール不足など */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of("FORBIDDEN", "この操作を行う権限がありません"));
    }

    /** 未認証（401） */
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<ApiError> handleUnauthenticated(AuthenticationCredentialsNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("UNAUTHORIZED", "ログインが必要です"));
    }
}
