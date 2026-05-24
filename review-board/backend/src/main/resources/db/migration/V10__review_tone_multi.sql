-- F-SAFE-01：レビューの希望トーンを「単一」→「多値」へ変更（複数歓迎を表現できるように）。
-- 観点（post_review_aspects）と同じく正規化テーブルにする。
CREATE TABLE post_review_tones (
    post_id BIGINT      NOT NULL REFERENCES posts (id),
    tone    VARCHAR(20) NOT NULL,
    PRIMARY KEY (post_id, tone)
);

-- 既存の単一トーンを保全（NULL 以外を 1 行ずつ移送）。
INSERT INTO post_review_tones (post_id, tone)
SELECT id, review_tone FROM posts WHERE review_tone IS NOT NULL;

-- 旧・単一列を撤去。
ALTER TABLE posts DROP COLUMN review_tone;
