package com.reviewboard.domain.mfa.dto;

/**
 * リカバリコードの残数（#241）。{@code remaining} が {@code lowThreshold} 以下ならフロントで警告する。
 */
public record MfaRecoveryStatusResponse(long remaining, int lowThreshold) {
}
