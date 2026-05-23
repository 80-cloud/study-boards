package com.reviewboard.common.tenant;

/**
 * テナント（マルチテナントの単位＝1企業）の識別子。
 *
 * <p><b>継ぎ目（モデルB: 組み込み/マルチテナント）。</b>現状の review-board は単一テナント前提で
 * 動作し、データ境界は cohort（受講期）と所有者で閉じている。複数企業へ提供/組み込みする段になったら、
 * cohort を所有する「組織(tenant)」を導入し、本型が実値を運ぶ。今は {@link #DEFAULT} 固定。
 *
 * <p>schema は変更しない（DB に tenant 列は持たせない）。実体化時は cohorts に tenant_id を足し、
 * {@link TenantContext#resolve} を配線するだけで全クエリの境界に乗せられる設計とする。
 */
public record TenantId(String value) {

    /** 単一テナント運用時の既定テナント。マルチテナント化までは常にこれ。 */
    public static final TenantId DEFAULT = new TenantId("default");
}
