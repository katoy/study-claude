# お問い合わせフォーム

Laravel 13.x で構築したお問い合わせフォームアプリケーション。一般ユーザーからの問い合わせ受付と、管理者による問い合わせ管理を実現します。

- **公開フォーム**: 3ステップの入力・確認・送信フロー
- **管理画面**: 認証付きの問い合わせ一覧・詳細・ステータス管理
- **認証**: Laravel Breeze（ブレード構成）

## 目次

- [必要要件](#必要要件)
- [技術スタック](#技術スタック)
- [インストール](#インストール)
- [初期セットアップ](#初期セットアップ)
- [主要コマンド](#主要コマンド)
- [機能](#機能)
- [ディレクトリ構造](#ディレクトリ構造)
- [開発](#開発)
- [テスト](#テスト)
- [トラブルシューティング](#トラブルシューティング)

## 必要要件

- PHP 8.3 以上
- Node.js 20 以上（フロントエンドアセットビルド用）
- Composer
- SQLite（デフォルト。他のDBも使用可）

## 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Laravel | 13.x | Webフレームワーク |
| PHP | 8.3+ | バックエンド言語 |
| Laravel Breeze | 2.4+ | 認証スカフォルディング |
| Tailwind CSS | v4 | スタイリング |
| Vite | 8.1+ | 開発サーバー・アセットビルド |
| SQLite | - | データベース |
| PHPUnit | - | テストフレームワーク |
| Laravel Pint | - | コード整形ツール |

## インストール

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd myproject
```

### 2. Composer 依存関係をインストール

```bash
composer install
```

### 3. Node 依存関係をインストール

```bash
npm install
```

## 初期セットアップ

### 環境ファイル設定

自動セットアップコマンドで、以下をすべて実行できます：

```bash
composer setup
```

このコマンドは以下を実行します：
- `.env` ファイルを生成
- アプリケーションキーを生成
- データベースマイグレーションを実行
- データベースシーダーを実行（テストデータ＆管理者アカウント作成）
- フロントエンドアセットをビルド

### 手動セットアップ

以下の手順で個別に実行することも可能です：

```bash
# .env ファイルのコピーと編集
cp .env.example .env

# アプリケーションキーを生成
php artisan key:generate

# データベースマイグレーション
php artisan migrate

# シーダーでテストデータを初期化
php artisan db:seed

# フロントエンドアセットをビルド
npm run build
```

## 主要コマンド

### 開発

```bash
# 開発サーバー起動（Artisan Serve + Vite + Queue + Pail ログを並列実行）
composer dev
```

開発サーバーが起動すると、以下にアクセス可能になります：
- アプリケーション: http://localhost:8000
- Vite HMR: http://localhost:5173

### ビルド・アセット

```bash
# 本番用にアセットをビルド
npm run build

# 開発用にアセットをビルド（ソースマップ付き）
npm run dev
```

### テスト

```bash
# テストを実行
composer test

# または直接実行
php artisan test

# 特定のテストクラスのみ実行
php artisan test --filter=ContactFormTest
```

### コード品質

```bash
# コード整形（Laravel Pint）
vendor/bin/pint

# 整形チェック（修正なし）
vendor/bin/pint --test

# 特定ファイルを整形
vendor/bin/pint app/Models
```

## 機能

### 公開フォーム（`/contact`）

認証不要で誰でもアクセス可能。

**ステップ1: 入力フォーム**
- お名前（必須、最大255文字）
- メールアドレス（必須、有効なメールアドレス形式）
- 件名（必須、最大255文字）
- 本文（必須、最大2000文字）

**ステップ2: 確認画面**
- 入力内容を確認
- 「戻る」で入力画面に戻される
- 「送信する」でデータベースに保存

**ステップ3: 完了画面**
- 「お問い合わせありがとうございました」メッセージ表示
- トップページへのリンク

### 管理画面（`/admin/contacts`）

Laravel Breeze で保護された認証必須エリア。

**ログイン**
- メールアドレス: `admin@example.com`
- パスワード: `password`

**一覧表示（`/admin/contacts`）**
- 受信日時で新しい順にソート
- 20件ごとにページネーション
- ステータスバッジ付き（新規=青、対応中=黄、解決済み=緑）
- 詳細へのリンク

**詳細表示＆ステータス管理（`/admin/contacts/{id}`）**
- 問い合わせ内容を確認
- ステータスをドロップダウンで変更
  - 新規（new）
  - 対応中（in_progress）
  - 解決済み（resolved）
- 更新ボタンで保存
- 一覧に戻るリンク

### データベーススキーマ

**contacts テーブル**

| カラム | 型 | 説明 |
|--------|-----|------|
| id | bigint | 主キー |
| name | varchar(255) | お名前 |
| email | varchar(255) | メールアドレス |
| subject | varchar(255) | 件名 |
| body | text | 本文 |
| status | varchar(20) | ステータス（new/in_progress/resolved） |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

## ディレクトリ構造

```
myproject/
├── app/
│   ├── Enums/
│   │   └── ContactStatus.php           # ステータス Enum
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── ContactController.php   # 公開フォームコントローラー
│   │   │   ├── Admin/
│   │   │   │   └── ContactController.php   # 管理画面コントローラー
│   │   │   └── Auth/                   # 認証関連（Breeze生成）
│   │   └── Requests/
│   │       ├── StoreContactRequest.php     # 問い合わせ送信バリデーション
│   │       └── UpdateContactStatusRequest.php  # ステータス更新バリデーション
│   ├── Models/
│   │   ├── Contact.php                 # 問い合わせモデル
│   │   └── User.php                    # ユーザーモデル
│   └── View/Components/                # Blade コンポーネント（Breeze生成）
├── database/
│   ├── migrations/
│   │   ├── xxxx_create_users_table.php
│   │   ├── xxxx_create_contacts_table.php  # 問い合わせテーブルマイグレーション
│   │   └── ...
│   ├── factories/
│   │   ├── UserFactory.php
│   │   └── ContactFactory.php          # テスト用ダミーデータ生成
│   └── seeders/
│       ├── DatabaseSeeder.php
│       └── AdminUserSeeder.php         # 管理者アカウント作成
├── resources/
│   ├── views/
│   │   ├── contacts/                   # 公開フォームビュー
│   │   │   ├── create.blade.php        # 入力フォーム
│   │   │   ├── confirm.blade.php       # 確認画面
│   │   │   └── complete.blade.php      # 完了画面
│   │   ├── admin/contacts/             # 管理画面ビュー
│   │   │   ├── index.blade.php         # 一覧表示
│   │   │   └── show.blade.php          # 詳細表示
│   │   ├── layouts/
│   │   │   ├── app.blade.php           # 認証済みレイアウト
│   │   │   ├── guest.blade.php         # ゲストレイアウト
│   │   │   └── public.blade.php        # 公開フォームレイアウト
│   │   ├── auth/                       # ログイン等（Breeze生成）
│   │   └── components/                 # UI コンポーネント（Breeze生成）
│   ├── css/
│   │   └── app.css                     # Tailwind CSS
│   └── js/
│       └── app.js
├── routes/
│   ├── web.php                         # Web ルート
│   └── auth.php                        # 認証ルート（Breeze生成）
├── tests/
│   ├── Feature/
│   │   ├── ContactFormTest.php         # 公開フォームテスト（12 テスト）
│   │   ├── Admin/
│   │   │   └── ContactControllerTest.php   # 管理画面テスト（9 テスト）
│   │   └── Auth/                       # 認証テスト（Breeze生成）
│   └── TestCase.php                    # テストベースクラス
├── composer.json                       # PHP 依存関係
├── package.json                        # Node 依存関係
├── vite.config.js                      # Vite 設定
├── tailwind.config.js                  # Tailwind CSS 設定
├── .env.example                        # 環境変数テンプレート
├── phpunit.xml                         # PHPUnit 設定
└── README.md                           # このファイル
```

## 開発

### ディレクトリ構成の原則

- **モデル**: `app/Models/` - ビジネスロジックとドメインコード
- **コントローラー**: `app/Http/Controllers/` - リクエスト処理ロジック
- **リクエスト**: `app/Http/Requests/` - バリデーション規則
- **Enum**: `app/Enums/` - 列挙型定義
- **ビュー**: `resources/views/` - テンプレート（レイアウト別に整理）
- **テスト**: `tests/Feature/` - 機能テスト

### コーディング規約

- **PHP コードスタイル**: PSR-12
- **型ヒント**: 可能な限り使用
- **コメント**: 日本語で、必要な場合のみ（WHY を説明）
- **命名規則**:
  - 関数・変数: `snake_case`
  - クラス: `PascalCase`
  - Enum: `PascalCase`
  - 定数: `UPPER_SNAKE_CASE`
- **整形**: `vendor/bin/pint` で自動実行

### ローカル開発フロー

```bash
# 1. 開発サーバー起動
composer dev

# 2. コードを編集（ブラウザでホットリロード確認）

# 3. テスト実行（修正前後で実行）
composer test

# 4. コード整形
vendor/bin/pint

# 5. git コミット
git add .
git commit -m "feat: 機能説明"
```

## テスト

### テストカバレッジ

- **ContactFormTest**: 公開フォームの3ステップフロー
  - フォーム表示
  - バリデーション（各項目の必須・形式・文字数）
  - セッション保存
  - DB 保存
  - 完了画面表示
  - 不正なアクセス防止

- **Admin/ContactControllerTest**: 管理画面の認証と CRUD
  - 認証ガード
  - 一覧表示・ページネーション
  - 詳細表示
  - ステータス更新
  - 不正な値の検証

### テスト実行例

```bash
# すべてのテストを実行
php artisan test

# 特定のテストクラスのみ
php artisan test --filter=ContactFormTest

# 特定のテストメソッドのみ
php artisan test --filter=test_contact_form_display

# テストカバレッジ付きで実行
php artisan test --coverage

# 詳細出力
php artisan test --verbose
```

### テストデータベース

テスト実行時は自動的にメモリ上の SQLite（`:memory:`）を使用します。テスト間でデータが分離されるため、テスト順序に依存しません。

## トラブルシューティング

### 問題: Node モジュール エラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 問題: コンポーザー依存関係エラー

```bash
# composer キャッシュをクリア
composer clear-cache
composer install
```

### 問題: マイグレーションエラー

```bash
# すべてのマイグレーションをロールバック
php artisan migrate:reset

# 再度マイグレーション実行
php artisan migrate --seed
```

### 問題: .env ファイルが見つからない

```bash
# .env ファイルをコピー
cp .env.example .env

# アプリケーションキーを生成
php artisan key:generate
```

### 問題: ポート 8000 / 5173 が使用中

別のプロセスがポートを使用している場合：

```bash
# macOS / Linux で使用中のプロセスを確認
lsof -i :8000
lsof -i :5173

# プロセスを終了
kill -9 <PID>

# または別のポートで起動（composer dev では設定不可のため、個別実行）
php artisan serve --port=8001
npm run dev -- --port 5174
```

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。
