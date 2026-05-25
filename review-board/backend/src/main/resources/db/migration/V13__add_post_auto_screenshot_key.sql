-- #218 自動サムネ化：demo_url をヘッドレス撮影した画像の S3 キー。
-- 手動アップロード（screenshot_key）とは別管理し、表示は手動 > 自動 > グラデの優先順。
ALTER TABLE posts ADD COLUMN auto_screenshot_key VARCHAR(512);
