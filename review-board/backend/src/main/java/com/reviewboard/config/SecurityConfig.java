package com.reviewboard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * ★S軸の中核。RBAC + ステートレス認可の土台。
 *
 * <p>方針（要件定義書 §3-2・テスト計画書 §6）：
 * <ul>
 *   <li>セッションは持たない（STATELESS）。認証は JWT in HttpOnly Cookie（後続 PR で JWT フィルタを追加）。</li>
 *   <li>ロール別の細かい認可はメソッドレベル（{@code @PreAuthorize}）で行うため EnableMethodSecurity。</li>
 *   <li>{@code /actuator/health} と将来のログインのみ公開、それ以外は認証必須。</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CorsConfigurationSource Bean（CorsConfig）を使う
            .cors(Customizer.withDefaults())
            // TODO(Phase1 認証PR): JWT in HttpOnly Cookie のため、CSRF は SameSite Cookie +
            // 同期トークン方式で別途対策する（テスト計画書 §7）。雛形段階では一旦無効化。
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/auth/login").permitAll()
                .anyRequest().authenticated())
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable());
        return http.build();
    }

    /** パスワードは bcrypt でハッシュ化（ER図 §3-1）。 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
