-- レートリミットの Postgres ストア化（Issue #267・SEC-12 多インスタンス対応）。
--
-- bucket_key = "<ip>|<uri>"。window_started_at は「窓の開始時刻」で、最初のリクエスト時に now で立て、
-- 窓が満了するまでは increment、満了後は count=1・window_started_at=now にリセットする
-- （in-memory 版と同じ「最初のリクエストから windowSeconds」の固定窓＝バースト中の窓跨ぎを避ける）。
-- 増分は原子的アップサート（INSERT ... ON CONFLICT DO UPDATE ... RETURNING）で1文。多インスタンスで共有。
-- 期限切れ行は @Scheduled で定期削除する。
CREATE TABLE rate_limit_buckets (
    bucket_key        VARCHAR(255) PRIMARY KEY,
    window_started_at TIMESTAMPTZ  NOT NULL,
    request_count     INTEGER      NOT NULL
);

CREATE INDEX idx_rate_limit_buckets_window ON rate_limit_buckets (window_started_at);
