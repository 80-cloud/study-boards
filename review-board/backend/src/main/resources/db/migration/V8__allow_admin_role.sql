-- 運用管理ロール ADMIN を許可する（最小オンボーディング基盤・Issue #170）。
-- V1 の users.role は CHECK (role IN ('STUDENT','TEACHER')) で ADMIN を弾くため、
-- CHECK 制約を張り替えて ADMIN を追加する。ADMIN は cohort 作成・アカウント発行の運用専用。
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN'));
