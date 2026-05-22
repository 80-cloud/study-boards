package com.reviewboard.domain.review;

/**
 * 観点別コメントの軸（F-REV-01）。母の品質4軸に対応（①動作・正しさ ②可読性・保守性
 * ③セキュリティ ④性能・UX）。各軸は任意入力。
 */
public enum ReviewAxis {
    CORRECTNESS,
    MAINTAINABILITY,
    SECURITY,
    PERFORMANCE
}
