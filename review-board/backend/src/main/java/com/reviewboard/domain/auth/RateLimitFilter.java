package com.reviewboard.domain.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reviewboard.common.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * ★SEC-12：認証エンドポイントの総当たり・列挙対策（軽量な in-memory 固定窓レートリミット）。
 *
 * <p>POST /api/auth/{login,register,refresh} に IP 単位で上限を課す。超過は 429（JSON）。
 * 新規依存を避け、{@link ConcurrentHashMap} の固定窓で実装する。
 *
 * <p>制約：単一インスタンス前提（メモリ保持）。多インスタンス化時は共有ストア（Redis 等）が要る。
 * 本番は nginx の {@code limit_req} と併用して多層化することも可能。
 *
 * <p>{@code @Component} の {@link OncePerRequestFilter} は Spring Boot がサーブレットチェーンへ自動登録する。
 * {@code @Order(HIGHEST_PRECEDENCE)} で Security チェーンより前段に置き、認証処理前に総当たりを弾く。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties props;
    private final ObjectMapper objectMapper;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /** 対象は POST の login/register/refresh のみ。それ以外と無効時は素通し。 */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!props.enabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return limitFor(request.getRequestURI()) <= 0;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        int limit = limitFor(request.getRequestURI());
        String key = clientIp(request) + "|" + request.getRequestURI();
        if (overLimit(key, limit)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(props.windowSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(),
                    ApiError.of("RATE_LIMITED", "試行が多すぎます。しばらくしてから再度お試しください。"));
            return;
        }
        chain.doFilter(request, response);
    }

    /** パスごとの上限（0 以下＝対象外）。 */
    private int limitFor(String uri) {
        if (uri == null) {
            return 0;
        }
        return switch (uri) {
            case "/api/auth/login" -> props.loginMax();
            case "/api/auth/register" -> props.registerMax();
            case "/api/auth/refresh" -> props.refreshMax();
            case "/api/auth/password-reset/request" -> props.passwordResetMax();
            default -> 0;
        };
    }

    /** 固定窓カウント。窓を跨いだらリセット。上限超過なら true。 */
    private boolean overLimit(String key, int limit) {
        long now = System.currentTimeMillis();
        long windowMs = props.windowSeconds() * 1000L;
        Window w = windows.compute(key, (k, cur) -> {
            if (cur == null || now - cur.startMs >= windowMs) {
                return new Window(now);
            }
            return cur;
        });
        return w.count.incrementAndGet() > limit;
    }

    /** X-Forwarded-For（nginx 経由）の先頭ホップを優先。無ければ remoteAddr。 */
    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }

    /** テスト用：窓カウントを全消去（テスト間で状態を持ち越さないため）。 */
    public void clear() {
        windows.clear();
    }

    private static final class Window {
        final long startMs;
        final AtomicInteger count = new AtomicInteger(0);

        Window(long startMs) {
            this.startMs = startMs;
        }
    }
}
