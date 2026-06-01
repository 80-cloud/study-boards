package com.reviewboard.observability;

import com.reviewboard.domain.auth.AuthPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * 1リクエストを横断追跡するための相関 ID を MDC に載せる（共通設計方針 オブザーバビリティ）。
 *
 * <ul>
 *   <li>{@code requestId}：受信した {@code X-Request-Id} を尊重し、無ければ UUID を採番する
 *       （ロードバランサ／フロントが付けた ID を引き継げる）。レスポンスにも同名で返す。</li>
 *   <li>{@code userId}：検証済みの {@link AuthPrincipal} から導出する（クライアント入力ではない）。
 *       未認証なら付与しない（プレーンログでは空欄になる）。</li>
 * </ul>
 *
 * <p>{@link com.reviewboard.domain.auth.JwtAuthenticationFilter} の後段に挿す（SecurityConfig）。
 * その時点で SecurityContext は確立済みのため userId を載せられる。
 * 機密（パスワード・トークン）は MDC に載せない（SEC-9）。
 */
@Component
public class MdcLoggingFilter extends OncePerRequestFilter {

    /** MDC キー。Logback パターン（%X{...}）・構造化ログのフィールド名と一致させること。 */
    static final String REQUEST_ID = "requestId";
    static final String USER_ID = "userId";
    /** 相関 ID の受け渡しヘッダ。リクエスト・レスポンス共通。 */
    static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = resolveRequestId(request);
        try {
            MDC.put(REQUEST_ID, requestId);
            response.setHeader(REQUEST_ID_HEADER, requestId);
            currentUserId().ifPresent(id -> MDC.put(USER_ID, id));
            filterChain.doFilter(request, response);
        } finally {
            // スレッドプール再利用で次のリクエストに漏れないよう必ず掃除する。
            MDC.remove(REQUEST_ID);
            MDC.remove(USER_ID);
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String incoming = request.getHeader(REQUEST_ID_HEADER);
        return StringUtils.hasText(incoming) ? incoming : UUID.randomUUID().toString();
    }

    private java.util.Optional<String> currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthPrincipal principal) {
            return java.util.Optional.of(String.valueOf(principal.userId()));
        }
        return java.util.Optional.empty();
    }
}
