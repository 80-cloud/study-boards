-- いいね（👍）：成果物への「いいね」。ランキング（いいね数順）の基準。
-- 1 ユーザー 1 投稿につき 1 件（UNIQUE）。投稿削除で子行も消す。
CREATE TABLE post_likes (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT      NOT NULL REFERENCES posts (id),
    user_id    BIGINT      NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);
CREATE INDEX idx_post_likes_post ON post_likes (post_id);

-- 非正規化カウンタ（一覧・ランキングの軽量化。書き込みと同一Txで増減・母 S-3）。
ALTER TABLE posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
