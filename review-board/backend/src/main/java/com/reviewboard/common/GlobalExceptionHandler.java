package com.reviewboard.common;

import com.reviewboard.domain.auth.BadCredentialsException;
import com.reviewboard.domain.auth.InvalidRefreshTokenException;
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

    /** ビジネスルール違反（400）：自己レビュー・観点重複など */
    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiError> handleInvalidRequest(InvalidRequestException ex) {
        return ResponseEntity.badRequest().body(ApiError.of("INVALID_REQUEST", ex.getMessage()));
    }

    /** リソース無し/他 cohort/他人の資源/削除済み（404・存在を漏らさず IDOR 遮断） */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("NOT_FOUND", "対象が見つかりません"));
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

    /** ログイン認証失敗（401・存在を漏らさない汎用メッセージ） */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("BAD_CREDENTIALS", ex.getMessage()));
    }

    /** refresh トークン無効（401・未知/期限切れ/reuse 検知） */
    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiError> handleInvalidRefresh(InvalidRefreshTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("INVALID_REFRESH_TOKEN", "再ログインが必要です"));
    }
}
