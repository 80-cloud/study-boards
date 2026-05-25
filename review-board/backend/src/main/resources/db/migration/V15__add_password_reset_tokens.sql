-- B-4 パスワードリセット（Issue #231）。ユーザーが自分でパスワードを再設定する自己回復フロー。
--
-- セキュリティ（S軸）：
--  - 生トークンはメールリンクにのみ載せ、DB には SHA-256 hex（CHAR 64）で保存（URL/ログ漏洩耐性・refresh / invite と同方針）。
--  - 検証は raw 比較ではなく token_hash の UNIQUE lookup で行う（timing 比較なし）。
--  - 1 度きりの使い捨て：消費時に used_at を立て、再利用は拒否（400）。期限切れ（expires_at）も拒否。
--  - user 削除時は CASCADE（孤児トークンを残さない）。

CREATE TABLE password_reset_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash CHAR(64)    NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
