-- F-AUTH-02 招待フロー（Issue #165）。講師/管理者が cohort 単位で招待コードを発行し、
-- 受講生が自分で登録できるようにする（管理者が 1 人ずつ手動発行する運用の入口を開く）。
--
-- セキュリティ（セキュリティ）：
--  - 生コードは発行時に 1 度だけ返し、DB には SHA-256 hex（CHAR 64）で保存（URL/ログ漏洩耐性・refresh token と同方針）。
--  - 検証は raw 比較ではなく code_hash の UNIQUE lookup で行う（timing 比較なし）。
--  - cohort_id は cohort 削除時 CASCADE。created_by は発行者退会時 SET NULL（未使用招待は失効させない）。
--  - 失効は max_uses / expires_at / revoked_at の 3 条件で判定。

CREATE TABLE cohort_invites (
    id            BIGSERIAL   PRIMARY KEY,
    cohort_id     BIGINT      NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    code_hash     CHAR(64)    NOT NULL,
    created_by    BIGINT      REFERENCES users(id) ON DELETE SET NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    max_uses      INT         NOT NULL DEFAULT 30 CHECK (max_uses > 0),
    current_uses  INT         NOT NULL DEFAULT 0  CHECK (current_uses >= 0),
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_cohort_invites_hash    ON cohort_invites (code_hash);
CREATE        INDEX idx_cohort_invites_cohort   ON cohort_invites (cohort_id, expires_at);
