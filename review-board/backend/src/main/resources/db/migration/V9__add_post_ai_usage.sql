-- 成果物の「AI使用状況」開示タグ（Issue #172）。
-- 値は AiUsage（NONE/PARTIAL/USED）。未設定は NULL。
-- review_tone（V4）と同様に CHECK 制約は付けず、値の妥当性はアプリ層（enum）で担保する。
ALTER TABLE posts ADD COLUMN ai_usage VARCHAR(20);
