-- MFA リカバリコード（Issue #241）。端末/認証アプリ紛失時の自己復旧手段。
--
-- セキュリティ（S軸）：
--  - 生コードは MFA 有効化応答で1度だけ返し、DB には SHA-256 hex（CHAR 64）で保存
--    （refresh / invite / password-reset と同方針。漏洩耐性・timing 比較なしの UNIQUE lookup）。
--  - 1 度きりの使い捨て：消費時に used_at を立て、再利用は拒否（401）。
--  - user 削除時は CASCADE（孤児コードを残さない）。disable 時はアプリ層で全削除。

CREATE TABLE mfa_recovery_codes (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash  CHAR(64)    NOT NULL UNIQUE,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_recovery_codes_user ON mfa_recovery_codes (user_id);
