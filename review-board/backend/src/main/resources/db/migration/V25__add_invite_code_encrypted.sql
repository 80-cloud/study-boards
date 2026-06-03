-- #563：発行済みの招待リンクを後から再表示できるようにする。
-- 生コードを平文では保存せず、TOTP と同じ at-rest 暗号化（AES-256-GCM・SecretCipher）で
-- 暗号化した値だけを保持する。講師/管理者のみアクセスできる一覧 API で復号して返す。
-- 既存の招待（暗号文なし）は NULL のままで、従来どおり「発行時のみ表示」の扱いになる。

ALTER TABLE cohort_invites
    ADD COLUMN code_encrypted VARCHAR(255);
