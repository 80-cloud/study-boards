-- 監査ログ改ざん防止（Issue #247）。cohort 単位のハッシュ連鎖（hash-chain）。
--
-- 仕組み：
--  - 各行に entry_hash = SHA256(prev_hash + 正規化レコード) を持つ。prev_hash は同 cohort の
--    直前行の entry_hash（cohort ごとに独立した連鎖）。1 行でも書き換えると以降の連鎖が破れる。
--  - genesis（cohort の最初の行）は prev_hash = NULL。
--
-- セキュリティ（セキュリティ）：
--  - 後からの単独改ざんを検知できる。検証は講師限定 GET /api/audit-logs/verify（自 cohort）。
--  - 並行書き込みの prev_hash 競合は、記録 TX 内の pg_advisory_xact_lock(cohort_id) で single-writer 化。
--
-- 前方連鎖の方針：
--  - 既存行（V19 以前）はハッシュ無し（prev_hash/entry_hash = NULL）のまま残す。過去行の
--    再ハッシュ（SQL での連鎖再構成）は Java 側の正規化と完全一致させる必要があり、誤差で検証が
--    壊れるリスクが高いため行わない。連鎖と検証は **V19 以降の新規行から** 有効（entry_hash IS NOT NULL）。
--  - そのため両列とも NULL 許容。

ALTER TABLE audit_logs
    ADD COLUMN prev_hash  CHAR(64),
    ADD COLUMN entry_hash CHAR(64);
