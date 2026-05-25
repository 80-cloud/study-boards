package com.reviewboard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reviewboard.common.ApiError;
import com.reviewboard.domain.auth.JwtAuthenticationFilter;
import com.reviewboard.observability.MdcLoggingFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * ★S軸の中核。RBAC + ステートレス認可。
 *
 * <ul>
 *   <li>セッションは持たない（STATELESS）。認証は JWT in HttpOnly Cookie（{@link JwtAuthenticationFilter}）。</li>
 *   <li>ロール別の細かい認可はメソッドレベル（{@code @PreAuthorize}）で行う。</li>
 *   <li>未認証は 401・認可不可は 403 を JSON で返す（機能一覧.md §共通仕様）。</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    public SecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
                                           MdcLoggingFilter mdcFilter,
                                           @org.springframework.beans.factory.annotation.Value(
                                                   "${app.embedding.frame-ancestors:'none'}")
                                           String frameAncestors) throws Exception {
        http
            .cors(Customizer.withDefaults())
            // JWT in HttpOnly Cookie + SameSite=Strict 方式。CSRF は SameSite で緩和する
            // （ステートレス API のため CSRF トークンは持たない。テスト計画書 §7）。
            .csrf(csrf -> csrf.disable())
            // 組み込み(モデルB)の継ぎ目：既定は現状どおり frame 拒否（X-Frame-Options: DENY）。
            // app.embedding.frame-ancestors に顧客オリジンを設定したときだけ、X-Frame-Options を外し
            // CSP frame-ancestors で許可オリジンに限定して iframe 埋め込みを解放する。
            .headers(h -> {
                if (!isFramingLocked(frameAncestors)) {
                    h.frameOptions(fo -> fo.disable())
                     .contentSecurityPolicy(csp -> csp.policyDirectives("frame-ancestors " + frameAncestors));
                }
                // ロック時（既定）は Spring 既定の X-Frame-Options: DENY をそのまま維持する。
            })
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // health は監視プローブ用に開放（liveness/readiness）。
                .requestMatchers("/actuator/health",
                        "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
                        "/api/auth/register").permitAll()
                // 運用メトリクスは情報漏えいを避けるため運用ロール（講師）限定（SEC-2/SEC-11）。
                // 誰でも JVM ヒープ・Hikari プール・流量を覗ける状態にしない。
                .requestMatchers("/actuator/**").hasRole("TEACHER")
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) ->
                        writeError(res, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "ログインが必要です"))
                .accessDeniedHandler((req, res, e) ->
                        writeError(res, HttpStatus.FORBIDDEN, "FORBIDDEN", "この操作を行う権限がありません")))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            // jwt の後段で MDC に requestId/userId を載せる（SecurityContext 確立後）。
            .addFilterAfter(mdcFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    /** frame-ancestors が未設定または {@code 'none'} なら「埋め込み拒否（現状維持）」とみなす。 */
    private boolean isFramingLocked(String frameAncestors) {
        if (frameAncestors == null) {
            return true;
        }
        String v = frameAncestors.trim();
        return v.isEmpty() || v.equals("'none'") || v.equalsIgnoreCase("none");
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse res, HttpStatus status,
                            String code, String message) throws java.io.IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ApiError.of(code, message));
    }

    /** パスワードは bcrypt でハッシュ化（ER図 §3-1）。 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
