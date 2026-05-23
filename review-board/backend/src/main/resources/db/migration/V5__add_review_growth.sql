-- F-GROW-01 成長ループ管理：投稿者が各レビューへの対応状態と Before-After を記録する。
-- 状態は GrowthStatus（OPEN/FIXED/WONT_FIX/RE_REVIEW_REQUESTED/RESOLVED）。既定は OPEN（未対応）。
ALTER TABLE reviews ADD COLUMN growth_status VARCHAR(30) NOT NULL DEFAULT 'OPEN';

-- Before-After メモ（投稿者の自由記述・任意）。
ALTER TABLE reviews ADD COLUMN before_after TEXT;
