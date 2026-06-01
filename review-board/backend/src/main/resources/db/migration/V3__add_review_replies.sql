-- F-REV-04 レビュー返信（スレッド）：レビューに対する返信を保持する。
-- 親レビューに replies_count を非正規化（共通設計方針。同一 TX 更新＋将来の定期再計算で補正）。
CREATE TABLE review_replies (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT      NOT NULL REFERENCES reviews (id),
    replier_user_id BIGINT      NOT NULL REFERENCES users (id),
    body            TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_review_replies_review ON review_replies (review_id) WHERE deleted_at IS NULL;

ALTER TABLE reviews ADD COLUMN replies_count INT NOT NULL DEFAULT 0;
