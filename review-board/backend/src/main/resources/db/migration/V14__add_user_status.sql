-- #229 メンバー無効化（kick）：ユーザーの有効/無効状態。
-- DISABLED はログイン不可（AuthService.login で 403）。既存は ACTIVE。
ALTER TABLE users ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'DISABLED'));
