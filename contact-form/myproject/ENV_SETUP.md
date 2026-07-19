# 環境設定ガイド

## 開発環境 (.env)

```bash
APP_ENV=local
APP_DEBUG=true
SESSION_ENCRYPT=false
LOG_LEVEL=debug
MAIL_MAILER=log
```

**用途**: ローカル開発、デバッグ

---

## 本番環境設定

### 1. `.env` 更新

```bash
# セキュリティ設定
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# 管理者設定（パスワードは12文字以上）
ADMIN_NAME=管理者
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-random-password

# セッション設定
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict

# ログレベル
LOG_LEVEL=warning

# メール設定（SMTP推奨）
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-app-password
```

### 2. 環境変数の確認

```bash
# 本番環境のキャッシュクリア
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 確認
php artisan config:show | grep APP_DEBUG
php artisan config:show | grep SESSION_ENCRYPT
php artisan config:show session | grep secure
```

管理者フラグを追加するマイグレーションと、安全な管理者作成を実行します：

```bash
php artisan migrate --force
php artisan db:seed --class=AdminUserSeeder --force
```

### 3. セキュリティチェックリスト

- [ ] `APP_DEBUG=false`
- [ ] `SESSION_ENCRYPT=true`
- [ ] `SESSION_SECURE_COOKIE=true` (HTTPS使用時)
- [ ] `SESSION_SAME_SITE=strict`
- [ ] `ADMIN_PASSWORD` が12文字以上のランダムな値
- [ ] `MAIL_MAILER=smtp` (ログ出力以外)
- [ ] `LOG_LEVEL=warning`
- [ ] `APP_KEY` が生成されている

### 4. HTTPS設定（Nginx例）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # HTTP → HTTPS リダイレクト
    error_page 497 https://$host$request_uri;
}

# HTTP リダイレクト
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### 5. レート制限

```dotenv
# 確認画面は1分あたり30回、DB保存は1分あたり5回（IP単位）
CONTACT_CONFIRMATION_RATE_LIMIT=30
CONTACT_SUBMISSION_RATE_LIMIT=5
```

---

## テスト

```bash
# 開発環境での本番設定テスト
APP_ENV=production php artisan test

# 設定キャッシュ有効でのテスト
php artisan config:cache
php artisan test
php artisan config:clear
```

---

## トラブルシューティング

**セッションエラー (419 Page Expired)**
- `SESSION_ENCRYPT=true` が有効か確認
- ブラウザキャッシュクリア
- `php artisan cache:clear`

**メール送信エラー**
- SMTP認証情報を確認
- ファイアウォール/ポート制限確認

**HTTPS自動リダイレクト**
- `APP_URL=https://your-domain.com` に設定
