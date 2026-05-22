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
 * access トークン（HttpOnly Cookie）を検証して SecurityContext を確立する。
 * トークンが無い/不正なら認証を設定しないだけ（認可は後段で 401/403 を返す）。
 * ロールは {@code ROLE_STUDENT} / {@code ROLE_TEACHER} の権限に写す（RBAC）。
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String token = readAccessCookie(request);
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
}
