-- F-NOTIF-01 通知（ポーリング・WebSocket不使用）。受信者本人のみが閲覧・既読化できる。
-- type：REVIEW_RECEIVED（自分の投稿にレビュー）／THANKS_RECEIVED（自分のレビューにありがとう）。
CREATE TABLE notifications (
    id                BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT      NOT NULL REFERENCES users (id),
    actor_user_id     BIGINT      NOT NULL REFERENCES users (id),
    type              VARCHAR(30) NOT NULL,
    post_id           BIGINT,
    review_id         BIGINT,
    read_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL
);

-- ベルの未読数・一覧は受信者で引く。未読の数え上げを速くするため部分インデックス。
CREATE INDEX idx_notifications_recipient ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (recipient_user_id) WHERE read_at IS NULL;
