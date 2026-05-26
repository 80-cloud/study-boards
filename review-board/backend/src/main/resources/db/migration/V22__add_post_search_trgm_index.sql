-- 投稿検索の高速化（Issue #265）。pg_trgm トライグラム GIN 索引。
--
-- PostRepository.search はタイトル/説明の `lower(col) LIKE lower('%q%')` 部分一致を使う。
-- tsvector('simple') は空白区切り前提で日本語の部分一致に弱い（劣化）ため不採用。
-- pg_trgm はトライグラム単位の索引で、ILIKE のセマンティクスを保ったまま部分一致を索引化でき、
-- 日本語にも有効。クエリは変更せず、planner が本索引を使う。
--
-- pg_trgm は RDS PostgreSQL・postgres:16（contrib 同梱）とも利用可能。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_posts_title_trgm
    ON posts USING gin (lower(title) gin_trgm_ops);

CREATE INDEX idx_posts_description_trgm
    ON posts USING gin (lower(description) gin_trgm_ops);
