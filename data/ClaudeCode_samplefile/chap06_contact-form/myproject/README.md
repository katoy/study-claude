# お問い合わせフォーム（書籍サンプル）

Laravel で実装した「お問い合わせフォーム + 管理ページ」のサンプルプロジェクトです。仕様の詳細は [`docs/仕様書.md`](docs/仕様書.md)、開発時のルールは [`CLAUDE.md`](CLAUDE.md) を参照してください。

## 必要環境

- PHP 8.2 以上
- Composer
- Node.js / npm
- SQLite（PHP の `pdo_sqlite` 拡張）

リポジトリ同梱の `.devcontainer` を使えば、VS Code の Dev Containers 拡張で上記が揃った環境がそのまま起動します。

## セットアップ

リポジトリを取得したら、`myproject/` ディレクトリに移動して以下を実行します。

```bash
composer setup
```

`composer.json` に定義されているスクリプトで、以下がまとめて実行されます。

1. `composer install` — PHP 依存パッケージのインストール
2. `.env.example` から `.env` をコピー
3. `php artisan key:generate` — アプリケーションキーの生成
4. `php artisan migrate --force` — SQLite にテーブルを作成
5. `npm install` — フロント依存のインストール
6. `npm run build` — CSS/JS のビルド

手動で行う場合は次のとおりです。

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

## 開発サーバーの起動

```bash
composer dev
```

`php artisan serve`、キューワーカー、ログ表示（`pail`）、Vite を同時に起動します。

起動したら、ブラウザで以下にアクセスして動作確認できます。

| URL | 内容 |
| --- | --- |
| http://localhost:8000/ | お問い合わせフォーム（入力 → 確認 → 送信完了） |
| http://localhost:8000/admin/login | 管理ページのログイン |
| http://localhost:8000/admin/contacts | お問い合わせ一覧（要ログイン） |

管理ページのログインパスワードは `.env` の `ADMIN_PASSWORD` で設定します（初期値は `password`）。

サーバーだけを単独で動かしたい場合は次のコマンドでも可能です。

```bash
php artisan serve
```

## テスト

```bash
php artisan test
```

## ライセンス

本サンプルが利用している Laravel フレームワークは [MIT License](https://opensource.org/licenses/MIT) です。
