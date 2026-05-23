package com.reviewboard.common.tenant;

import com.reviewboard.domain.auth.AuthPrincipal;
import org.springframework.stereotype.Component;

/**
 * テナント境界の解決を1箇所に集約する<b>継ぎ目</b>（モデルB: マルチテナント化の起点）。
 *
 * <p>現状は単一テナント前提のため常に {@link TenantId#DEFAULT} を返す（挙動は現状と同一）。
 * マルチテナント化の際は、ここだけを「principal が属する組織(tenant)を解決する」実装に差し替え、
 * リポジトリ/サービスの境界条件に tenant を AND する。境界導出が散在しないよう、
 * 将来の tenant 参照は必ず本クラス経由にする。
 *
 * <p>認可の主境界は引き続き cohort（{@link AuthPrincipal#cohortId()}）と所有者であり、
 * tenant はその上位に被さる将来の枠（現状は無効化＝DEFAULT 固定）。
 */
@Component
public class TenantContext {

    /**
     * 認証済み principal からテナントを解決する。
     * 現状: 単一テナント運用のため {@link TenantId#DEFAULT}。
     * 将来: principal.cohortId() の所有組織を解決して返す。
     */
    public TenantId resolve(AuthPrincipal principal) {
        return TenantId.DEFAULT;
    }

    /** principal を持たない文脈（バッチ等）向け。現状は DEFAULT 固定。 */
    public TenantId current() {
        return TenantId.DEFAULT;
    }
}
