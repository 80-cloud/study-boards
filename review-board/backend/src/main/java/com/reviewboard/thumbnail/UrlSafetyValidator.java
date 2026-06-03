package com.reviewboard.thumbnail;

import com.reviewboard.common.InvalidRequestException;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * ★SSRF 遮断（セキュリティ）：ヘッドレス撮影でサーバーが開く URL の安全性を検証する。
 *
 * <p>demo_url は利用者入力のため、サーバーが任意 URL を開くと内部資源（クラウドメタデータ
 * 169.254.169.254／localhost／プライベート IP／RDS 等）への到達に悪用されうる。次を満たさないURLは拒否：
 * <ul>
 *   <li>スキームは http / https のみ（file: などは不可）。</li>
 *   <li>ホスト名を解決した <b>全ての</b> IP がグローバル（公開）であること。ループバック／リンクローカル
 *       （169.254/fe80）／サイトローカル（10・172.16-31・192.168）／ユニークローカル（fc00::/7）／
 *       any／マルチキャストはいずれも拒否。</li>
 * </ul>
 *
 * <p>残存リスク：DNS リバインディング（検証時は公開IP、撮影時に内部IPへ再解決）は本検証だけでは防げない。
 * このため本番では当面この機能を無効化し、有効化時は隔離された撮影ホスト（ADR 参照）で運用する。
 */
@Component
public class UrlSafetyValidator {

    /** 安全でなければ {@link InvalidRequestException} を投げる。安全なら正常 return。 */
    public void verifyPublicHttpUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new InvalidRequestException("URL が空です");
        }
        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("URL の形式が不正です");
        }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new InvalidRequestException("http / https の URL のみ対応します");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new InvalidRequestException("URL にホストがありません");
        }
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException e) {
            throw new InvalidRequestException("ホストを解決できません");
        }
        for (InetAddress addr : addresses) {
            if (!isGlobalUnicast(addr)) {
                // 具体的なアドレスは伏せ、内部到達を試みる入力を一律で拒否する。
                throw new InvalidRequestException("内部・非公開アドレスへの URL は指定できません");
            }
        }
    }

    /** 公開（グローバルユニキャスト）IP のみ true。内部到達に使える範囲はすべて false。 */
    private boolean isGlobalUnicast(InetAddress addr) {
        if (addr.isLoopbackAddress() || addr.isAnyLocalAddress()
                || addr.isLinkLocalAddress() || addr.isSiteLocalAddress()
                || addr.isMulticastAddress()) {
            return false;
        }
        byte[] b = addr.getAddress();
        if (b.length == 4) {
            int o0 = b[0] & 0xFF;
            int o1 = b[1] & 0xFF;
            // クラウドメタデータ 169.254.169.254 は link-local で上記により拒否済みだが念のため明示。
            if (o0 == 169 && o1 == 254) {
                return false;
            }
            // 100.64.0.0/10（CGNAT・キャリアグレード NAT）は内部寄りのため拒否。
            if (o0 == 100 && o1 >= 64 && o1 <= 127) {
                return false;
            }
        } else if (b.length == 16) {
            // ユニークローカル fc00::/7（最上位 7bit が 1111110）。
            if ((b[0] & 0xFE) == 0xFC) {
                return false;
            }
        }
        return true;
    }
}
