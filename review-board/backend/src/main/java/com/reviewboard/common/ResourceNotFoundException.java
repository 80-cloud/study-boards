package com.reviewboard.common;

/**
 * リソースが存在しない・所有者/cohort が一致しない・論理削除済みのときに投げる（404）。
 *
 * <p>★セキュリティ：他人/他 cohort の資源は「存在しない」と同じ 404 に倒し、存在を漏らさず IDOR を遮断する
 * （要件定義書 §3-2、共通設計方針・SEC-3）。「権限がない（403）」と区別しないのは意図的で、
 * リソース ID の有無を列挙させないため。
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
