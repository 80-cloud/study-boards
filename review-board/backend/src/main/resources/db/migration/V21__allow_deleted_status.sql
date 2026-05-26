-- アカウント削除（退会・Issue #263）。論理削除＋匿名化のため status に DELETED を許可する。
-- DELETED はログイン不可（AuthService は status != ACTIVE を遮断）。email/表示名等は
-- アプリ層で匿名化する。投稿・レビューは「退会したユーザー」として残る。
ALTER TABLE users DROP CONSTRAINT chk_users_status;
ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'DISABLED', 'DELETED'));
