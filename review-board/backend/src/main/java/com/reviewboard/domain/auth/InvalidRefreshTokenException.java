package com.reviewboard.domain.auth;

/** refresh トークンが無効（未知・期限切れ・reuse 検知）。401 に倒す。 */
public class InvalidRefreshTokenException extends RuntimeException {
    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
