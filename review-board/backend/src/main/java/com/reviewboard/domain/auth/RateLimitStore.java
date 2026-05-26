package com.reviewboard.domain.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * レートリミットの共有カウントストア（Issue #267・SEC-12）。Postgres を共有ストアにすることで
 * 多インスタンスでも総当たり防御が効く（in-memory 固定窓の単一インスタンス制約を解消）。
 *
 * <p>固定窓は「最初のリクエスト時刻から {@code windowSeconds}」。窓が満了するまでは increment、満了後は
 * count=1・window_started_at=now にリセットする（バースト中に壁時計境界をまたいで誤って窓が変わるのを防ぐ）。
 * 増分は原子的アップサート（{@code INSERT ... ON CONFLICT DO UPDATE ... RETURNING}）で1文に収める。
 */
@Component
public class RateLimitStore {

    // 窓満了の判定（window_started_at + windowSeconds 秒 > now）で increment か reset かを分岐する。
    private static final String INCREMENT_SQL = """
            INSERT INTO rate_limit_buckets (bucket_key, window_started_at, request_count)
            VALUES (?, ?, 1)
            ON CONFLICT (bucket_key) DO UPDATE SET
                request_count = CASE
                    WHEN rate_limit_buckets.window_started_at + (? * interval '1 second') > ?
                    THEN rate_limit_buckets.request_count + 1 ELSE 1 END,
                window_started_at = CASE
                    WHEN rate_limit_buckets.window_started_at + (? * interval '1 second') > ?
                    THEN rate_limit_buckets.window_started_at ELSE ? END
            RETURNING request_count
            """;

    private final JdbcTemplate jdbcTemplate;

    public RateLimitStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** {@code ip|uri} の窓内カウントを 1 増やし、増分後のカウントを返す。 */
    public int incrementAndCount(String key, int windowSeconds) {
        Timestamp now = Timestamp.from(Instant.now());
        Integer count = jdbcTemplate.queryForObject(
                INCREMENT_SQL, Integer.class,
                key, now, windowSeconds, now, windowSeconds, now, now);
        return count == null ? 1 : count;
    }

    /** 期限切れバケットの定期削除（残骸の肥大化防止）。既定 1 時間ごと。窓は分単位なので 1 時間超は確実に満了。 */
    @Scheduled(fixedDelayString = "${app.ratelimit.purge-interval-ms:3600000}")
    public void purgeExpired() {
        jdbcTemplate.update(
                "DELETE FROM rate_limit_buckets WHERE window_started_at < ?",
                Timestamp.from(Instant.now().minusSeconds(3600)));
    }

    /** テスト用：全バケットを消去（テスト間で状態を持ち越さない）。 */
    public void clear() {
        jdbcTemplate.update("DELETE FROM rate_limit_buckets");
    }
}
