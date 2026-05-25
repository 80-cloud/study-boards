-- TOTP シークレット at-rest 暗号化（Issue #249）に伴うカラム拡張。
--
-- V17 は平文 Base32（最長 64 文字）想定で totp_secret VARCHAR(64) としていた。
-- AES-GCM 暗号化後は "v1:" + base64(iv(12B) + ciphertext + tag(16B)) となり 64 文字を超える
-- （32 バイトの Base32 シークレットで約 83 文字）。余裕を持って 255 文字に拡張する。

ALTER TABLE users
    ALTER COLUMN totp_secret TYPE VARCHAR(255);
