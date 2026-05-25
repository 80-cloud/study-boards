# 正規TLS 手順書（DuckDNS ＋ Let's Encrypt）

> 本番の自己署名証明書（ブラウザ警告あり）を、**無料**の DuckDNS サブドメイン＋
> Let's Encrypt 証明書に切り替えて警告を解消するための運用手順。
> Issue #243。**追加課金ゼロ**（DuckDNS 無料・Let's Encrypt 無料）。

---

## 前提・現状

- 本番 EC2 は自己署名 TLS（`TLS_SELFSIGNED=1`）で `https://18.176.19.160` 稼働中（ブラウザ警告あり）。
- `infra/deploy/provision.sh` は `DOMAIN` 指定時に `certbot --nginx` で Let's Encrypt 証明書を取得する
  パスを実装済み（#243 で `server_name` 差し替えを追加し DuckDNS でも確実にマッチするようにした）。
- nginx vhost（`nginx-review-board.conf`）は SEC-13 セキュリティヘッダ（HSTS 含む）を付与済み。
  **HTTPS 化により HSTS が初めて実効化**する（A-1 の「nginx HSTS 未反映」もここで解消）。

## 修練城ルール（重要）

- 以下のうち **EC2 上のコマンド実行・nginx 再構成は人間が外部 Terminal で行う**
  （AI は terraform apply / SSM 書き込み / provision を単独実行しない）。
- 証明書の取得・切替は冪等で安全だが、**実行は本人**が行うこと。

---

## 手順

### 1. DuckDNS でサブドメインを取得し EC2 を指す（ブラウザ作業）

1. <https://www.duckdns.org> に GitHub/Google 等でログイン。
2. 好きなサブドメイン（例：`reviewlab`）を作成 → `reviewlab.duckdns.org` が払い出される。
3. その行の `current ip` に EC2 のパブリック IP（現状 `18.176.19.160`）を入力して **update**。
   - ※ IP が変わり得る場合は DuckDNS の更新トークンで定期更新も可能（DDNS の利点）。本番 EC2 が
     Elastic IP なら IP は固定なので一度の設定で足りる。
4. 反映確認（ローカル PC で）：

   ```bash
   dig +short reviewlab.duckdns.org   # → 18.176.19.160 が返れば伝播済み
   ```

### 2. EC2 にログインして provision.sh を DOMAIN モードで実行（外部 Terminal）

```bash
ssh -i ~/.ssh/aws-review-board ec2-user@reviewlab.duckdns.org   # or @18.176.19.160

sudo DOMAIN=reviewlab.duckdns.org \
     PUBLIC_ORIGIN=https://reviewlab.duckdns.org \
     CERTBOT_EMAIL=hidek.y1998@gmail.com \
     /opt/review-board/infra-deploy/provision.sh
```

- provision.sh が HTTP vhost を設置 → `server_name` を当該ドメインに差し替え → `certbot --nginx` で
  443/TLS＋80→443 リダイレクトを追加する。
- `CORS_ALLOWED_ORIGINS` は `PUBLIC_ORIGIN` と同値で `/opt/review-board/env` に書かれる。
- 続けてアプリを再投入（env を読み直す）：

  ```bash
  sudo /opt/review-board/deploy.sh <現在の本番SHA>
  ```

### 3. 検証（ローカル PC のブラウザ／curl）

```bash
# 正規証明書で警告なし・HSTS が付く
curl -sI https://reviewlab.duckdns.org/ | grep -iE 'strict-transport-security|HTTP/'
# HTTP → HTTPS 恒久リダイレクト
curl -sI http://reviewlab.duckdns.org/ | grep -iE 'location|HTTP/'
# 未認証 API は 401
curl -s -o /dev/null -w '%{http_code}\n' https://reviewlab.duckdns.org/api/auth/me
# health
curl -s https://reviewlab.duckdns.org/actuator/health
```

- ブラウザで `https://reviewlab.duckdns.org` を開き、**鍵マークが正常（警告なし）** を確認。
- 管理者ログイン → `/me` 往復 → Cookie が `Secure; HttpOnly; SameSite=Strict` を確認。

### 4. 証明書の自動更新

- certbot は `certbot.timer`（systemd）で自動更新される。確認：

  ```bash
  systemctl list-timers | grep certbot
  sudo certbot renew --dry-run
  ```

---

## ロールバック

- 問題があれば自己署名モードに戻せる：

  ```bash
  sudo TLS_SELFSIGNED=1 PUBLIC_ORIGIN=https://18.176.19.160 \
       /opt/review-board/infra-deploy/provision.sh
  ```

## 補足

- 独自ブランド名（年 $1〜12）にしたくなったら、購入後に同じ手順で `DOMAIN` を差し替えるだけ。
- メール（PUBLIC_ORIGIN を使うリンク）を実稼働させる場合は、本ドメインを SES の検証/From や
  メールリンクのベース URL に使う（メール実稼働は別タスク）。
