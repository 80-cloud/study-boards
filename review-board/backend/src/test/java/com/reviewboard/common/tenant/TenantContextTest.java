package com.reviewboard.common.tenant;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.user.UserRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 継ぎ目テスト：現状は単一テナント運用のため、TenantContext は常に DEFAULT を返す。
 * マルチテナント化(モデルB)の際は本クラスの resolve を差し替える、という配線点の固定化。
 */
class TenantContextTest {

    private final TenantContext tenantContext = new TenantContext();

    @Test
    void resolve_returnsDefault_forAnyPrincipal_underSingleTenant() {
        AuthPrincipal student = new AuthPrincipal(1L, 10L, UserRole.STUDENT);
        AuthPrincipal teacher = new AuthPrincipal(2L, 20L, UserRole.TEACHER);

        assertThat(tenantContext.resolve(student)).isEqualTo(TenantId.DEFAULT);
        assertThat(tenantContext.resolve(teacher)).isEqualTo(TenantId.DEFAULT);
        assertThat(tenantContext.current()).isEqualTo(TenantId.DEFAULT);
    }
}
