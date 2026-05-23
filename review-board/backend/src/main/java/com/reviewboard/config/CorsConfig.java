package com.reviewboard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS 設定。フロント（Vite）は localhost:5175 固定（CLAUDE.md §10）。
 * Cookie 認証のため allowCredentials=true。許可 origin は env で外部化（ハードコードしない）。
 *
 * <p><b>継ぎ目</b>：将来の外部連携(モデルA)・組み込み(モデルB)で顧客オリジンを足せるよう
 * {@code app.cors.allowed-origins}（カンマ区切りリスト）を受ける。未指定時は旧
 * {@code app.cors.allowed-origin}（単一）にフォールバックし、既定は現状の単一オリジンのまま。
 * allowCredentials=true のため {@code "*"} は使えず、明示リストで運用する（仕様どおり）。
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:${app.cors.allowed-origin:http://localhost:5175}}")
            String allowedOrigins) {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
