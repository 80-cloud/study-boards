-- review-board Phase 1 初期スキーマ（ER図.md 準拠）
-- スキーマの正は Flyway。Hibernate には作らせない（application.yml ddl-auto: none）。
-- セキュリティ：cohort 境界・所有者検証・論理削除・非正規化カウンタ・監査ログ。

-- ============================================================
-- cohorts：全認可境界の根（ER図 §1）
-- ============================================================
CREATE TABLE cohorts (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- users：RBAC の主体。role / cohort_id を最初から持つ
-- ============================================================
CREATE TABLE users (
    id                     BIGSERIAL PRIMARY KEY,
    email                  VARCHAR(255) NOT NULL UNIQUE,
    password_hash          VARCHAR(255) NOT NULL,
    display_name           VARCHAR(50)  NOT NULL,
    role                   VARCHAR(10)  NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    cohort_id              BIGINT       NOT NULL REFERENCES cohorts (id),
    bio                    VARCHAR(500),
    received_reviews_count INT          NOT NULL DEFAULT 0,
    given_reviews_count    INT          NOT NULL DEFAULT 0,
    thanks_received_count  INT          NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_cohort ON users (cohort_id);

-- ============================================================
-- refresh_tokens：JWT refresh の DB rotation（共通設計方針）
-- ============================================================
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id),
    token_hash CHAR(64)    NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ============================================================
-- posts：成果物。cohort_id を冗長保持し一覧の境界を単純化
-- ============================================================
CREATE TABLE posts (
    id             BIGSERIAL PRIMARY KEY,
    author_user_id BIGINT       NOT NULL REFERENCES users (id),
    cohort_id      BIGINT       NOT NULL REFERENCES cohorts (id),
    title          VARCHAR(100) NOT NULL,
    description    TEXT         NOT NULL,
    repo_url       VARCHAR(512),
    demo_url       VARCHAR(512),
    screenshot_key VARCHAR(512),
    recruit_status VARCHAR(10)  NOT NULL DEFAULT 'OPEN' CHECK (recruit_status IN ('OPEN', 'CLOSED')),
    review_count   INT          NOT NULL DEFAULT 0,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- 一覧（F-POST-03）：cohort 境界 + カーソル pagination（共通設計方針）
CREATE INDEX idx_posts_cohort_created ON posts (cohort_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_author ON posts (author_user_id);

-- ============================================================
-- post_meta：作品メタ情報を個別カラム化せず key-value に集約
-- ============================================================
CREATE TABLE post_meta (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT        NOT NULL REFERENCES posts (id),
    meta_key   VARCHAR(50)   NOT NULL,
    meta_value VARCHAR(1000) NOT NULL,
    CONSTRAINT uq_post_meta UNIQUE (post_id, meta_key)
);

-- ============================================================
-- tags / post_tags：技術タグ（多対多）
-- ============================================================
CREATE TABLE tags (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts (id),
    tag_id  BIGINT NOT NULL REFERENCES tags (id),
    CONSTRAINT pk_post_tags PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag ON post_tags (tag_id);

-- ============================================================
-- reviews：レビュー本体（良かった点・改善提案は必須）
-- ============================================================
CREATE TABLE reviews (
    id               BIGSERIAL PRIMARY KEY,
    post_id          BIGINT      NOT NULL REFERENCES posts (id),
    reviewer_user_id BIGINT      NOT NULL REFERENCES users (id),
    good             TEXT        NOT NULL,
    improvement      TEXT        NOT NULL,
    thanks_count     INT         NOT NULL DEFAULT 0,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_post ON reviews (post_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_user_id);

-- ============================================================
-- review_axis_comments：評価観点の観点別コメント（任意・1軸1行）
-- ============================================================
CREATE TABLE review_axis_comments (
    id        BIGSERIAL PRIMARY KEY,
    review_id BIGINT      NOT NULL REFERENCES reviews (id),
    axis      VARCHAR(20) NOT NULL CHECK (axis IN ('CORRECTNESS', 'MAINTAINABILITY', 'SECURITY', 'PERFORMANCE')),
    comment   TEXT        NOT NULL,
    CONSTRAINT uq_review_axis UNIQUE (review_id, axis)
);

-- ============================================================
-- thanks：ありがとう（冪等：1レビューに1ユーザー1回）
-- ============================================================
CREATE TABLE thanks (
    id           BIGSERIAL PRIMARY KEY,
    review_id    BIGINT      NOT NULL REFERENCES reviews (id),
    from_user_id BIGINT      NOT NULL REFERENCES users (id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_thanks UNIQUE (review_id, from_user_id)
);

-- ============================================================
-- evaluations：講師の最終評価（最新1件 + 履歴。is_latest）
-- ============================================================
CREATE TABLE evaluations (
    id              BIGSERIAL PRIMARY KEY,
    post_id         BIGINT      NOT NULL REFERENCES posts (id),
    teacher_user_id BIGINT      NOT NULL REFERENCES users (id),
    result          VARCHAR(10) NOT NULL CHECK (result IN ('APPROVED', 'RETURNED')),
    comment         TEXT        NOT NULL,
    is_latest       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evaluations_post_latest ON evaluations (post_id, is_latest);

-- ============================================================
-- audit_logs：★セキュリティ 監査（誰が・いつ・誰の資源に・何を）
-- ============================================================
CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT      NOT NULL REFERENCES users (id),
    action        VARCHAR(50) NOT NULL,
    target_type   VARCHAR(30) NOT NULL,
    target_id     BIGINT      NOT NULL,
    cohort_id     BIGINT      NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_actor_created ON audit_logs (actor_user_id, created_at);
