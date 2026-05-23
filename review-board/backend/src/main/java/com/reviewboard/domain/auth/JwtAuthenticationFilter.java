package com.reviewboard.domain.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * access トークンを検証して SecurityContext を確立する。
 * トークンが無い/不正なら認証を設定しないだけ（認可は後段で 401/403 を返す）。
 * ロールは {@code ROLE_STUDENT} / {@code ROLE_TEACHER} の権限に写す（RBAC）。
 *
 * <p>トークン受け渡しは既定で <b>HttpOnly Cookie のみ</b>（ブラウザ SPA・SameSite=Strict）。
 * 将来の外部連携(モデルA: 公開API/M2M)・組み込み(モデルB: widget)に備え、
 * {@code app.auth.bearer-enabled=true} のときだけ {@code Authorization: Bearer} ヘッダも受理する
 * <b>継ぎ目</b>を持つ（既定 false＝現状と完全に同一の挙動）。検証ロジックは Cookie と共通。
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    /**
     * Bearer ヘッダ認証の有効化フラグ（既定 false）。
     * 外部連携/組み込みを解放する企業要望が来たときに ON にする継ぎ目。
     * OFF の間は Authorization ヘッダを一切見ない（攻撃面を増やさない）。
     */
    private final boolean bearerEnabled;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   @org.springframework.beans.factory.annotation.Value(
                                           "${app.auth.bearer-enabled:false}") boolean bearerEnabled) {
        this.jwtService = jwtService;
        this.bearerEnabled = bearerEnabled;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                AuthPrincipal principal = jwtService.parse(token);
                var authority = new SimpleGrantedAuthority("ROLE_" + principal.role().name());
                var authentication = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(authority));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception ignored) {
                // 署名不正・期限切れ等は未認証扱い（SecurityContext を設定しない）
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * トークンの取り出し。Cookie を優先し、{@code bearer-enabled} のときのみ
     * {@code Authorization: Bearer} を補助的に見る（既定では Cookie のみ＝現状と同一）。
     */
    private String resolveToken(HttpServletRequest request) {
        String cookieToken = readAccessCookie(request);
        if (cookieToken != null) {
            return cookieToken;
        }
        if (bearerEnabled) {
            return readBearerHeader(request);
        }
        return null;
    }

    private String readAccessCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (AuthCookies.ACCESS.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private String readBearerHeader(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String value = header.substring(BEARER_PREFIX.length()).trim();
            return value.isEmpty() ? null : value;
        }
        return null;
    }
}
