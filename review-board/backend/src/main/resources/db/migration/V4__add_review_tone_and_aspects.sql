-- F-SAFE-01 心理的安全設定：投稿に「レビューのトーン区分」を単一で持たせる（投稿者本人のみ設定）。
-- 値は ReviewTone（WELCOME_BEGINNER/HARSH_OK/GENTLE）。未設定は NULL。
ALTER TABLE posts ADD COLUMN review_tone VARCHAR(20);

-- F-REQ-01 観点別レビュー依頼：投稿者が募集したい観点を多値で名指し（5軸）。
-- @ElementCollection で正規化。投稿削除時は Hibernate が自動で子行を消す（cleanup 順を増やさない）。
CREATE TABLE post_review_aspects (
    post_id BIGINT      NOT NULL REFERENCES posts (id),
    aspect  VARCHAR(20) NOT NULL,
    PRIMARY KEY (post_id, aspect)
);
