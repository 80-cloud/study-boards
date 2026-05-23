package com.reviewboard.domain.review.dto;

import com.reviewboard.domain.review.GrowthStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * F-GROW-01 対応状態の更新（投稿者本人のみ）。状態は必須、Before-After メモは任意。
 *
 * @param status      対応状態（不正な enum 値は 400）
 * @param beforeAfter Before-After メモ（null・空可）
 */
public record GrowthUpdateRequest(
        @NotNull GrowthStatus status,
        @Size(max = 2000) String beforeAfter) {
}
