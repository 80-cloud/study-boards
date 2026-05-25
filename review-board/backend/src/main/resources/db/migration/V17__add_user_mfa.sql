-- C-6 二要素認証（TOTP・Issue #235）。任意の MFA。
--
-- セキュリティ：
--  - totp_secret は TOTP 検証のため復号可能な形（Base32）で保持する必要がある（パスワードと異なり一方向化できない）。
--    現状は MVP として平文保持。将来の本実装では KMS/アプリ層暗号化での at-rest 暗号化を検討（ADR 候補）。
--  - mfa_enabled=true のときだけログインで TOTP を要求する。setup 中（pending）は secret を持つが enabled=false。

ALTER TABLE users
    ADD COLUMN totp_secret VARCHAR(64),
    ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
