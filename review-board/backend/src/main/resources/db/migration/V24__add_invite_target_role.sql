-- F-AUTH-02 拡張（#511）：招待コードで作るユーザーのロールを STUDENT / TEACHER から選べるようにする。
-- TEACHER 招待は ADMIN のみが発行可（バックエンド側で @PreAuthorize 制御）。
-- 既存の招待は STUDENT のまま動作させるため、DEFAULT 'STUDENT' で NOT NULL。

ALTER TABLE cohort_invites
    ADD COLUMN target_role VARCHAR(10) NOT NULL DEFAULT 'STUDENT';

-- 既知値（STUDENT / TEACHER）のみ。ADMIN 招待は本機能では出さない。
ALTER TABLE cohort_invites
    ADD CONSTRAINT cohort_invites_target_role_chk
    CHECK (target_role IN ('STUDENT', 'TEACHER'));
