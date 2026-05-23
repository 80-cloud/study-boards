-- プロフィールアバター画像。SEC-8 と同じ private バケットのオブジェクトキーを保持（本体は DB に置かない）。
-- 表示は短命の署名付き URL のみ（公開しない）。未設定は NULL。
ALTER TABLE users ADD COLUMN avatar_key VARCHAR(512);
