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
                                           MdcLoggingFilter mdcFilter) throws Exception {
        http
            .cors(Customizer.withDefaults())
            // JWT in HttpOnly Cookie + SameSite=Strict 方式。CSRF は SameSite で緩和する
            // （ステートレス API のため CSRF トークンは持たない。テスト計画書 §7）。
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // health は監視プローブ用に開放（liveness/readiness）。
                .requestMatchers("/actuator/health",
                        "/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
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
