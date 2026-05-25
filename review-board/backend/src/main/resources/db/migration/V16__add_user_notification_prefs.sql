-- C-5 通知設定（opt-out）と週次ダイジェスト（Issue #233・#175 follow-up）。
--
-- 設計方針：
--  - 行が無いユーザー＝既定（全 ON）として扱う。opt-out したときだけ行を作る（全ユーザー backfill 不要）。
--  - email_enabled：レビュー受領など個別の外向きメール全般の ON/OFF。
--  - weekly_digest：週次ダイジェスト（未レビュー成果物の掘り起こし）の ON/OFF。
--  - user 削除時は CASCADE（孤児設定を残さない）。

CREATE TABLE user_notification_prefs (
    user_id       BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email_enabled BOOLEAN     NOT NULL DEFAULT true,
    weekly_digest BOOLEAN     NOT NULL DEFAULT true,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
