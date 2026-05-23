-- F-REV-05 ベストレビュー：投稿者が最も役立ったレビューを1件選ぶ。
-- posts に参照を持たせる（NULL 許容＝未選択）。
-- reviews.post_id → posts と循環参照になるため、ON DELETE SET NULL で
-- レビュー行が物理削除された場合は参照を自動で外す（整合性を保つ）。
ALTER TABLE posts ADD COLUMN best_review_id BIGINT REFERENCES reviews (id) ON DELETE SET NULL;
