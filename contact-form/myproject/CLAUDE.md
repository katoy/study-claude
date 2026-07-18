# お問い合わせフォーム

## プロジェクト概要
Laravelで作るお問い合わせフォーム。

## 技術仕様
- **Backend**: Laravel 13.x (PHP 8.3+)
- **Frontend**: Vite, Tailwind CSS v4
- **Database**: SQLite (`database/database.sqlite`)

## 主要コマンド

### 開発・ビルド
- **環境セットアップ**: `composer setup` (依存関係の解決、`.env` の生成、キー生成、マイグレーション、アセットビルドを一括実行)
- **開発サーバー起動**: `composer dev` (Artisan Serve, Vite, Queue, Pailログを並列起動)
- **アセットビルド**: `npm run build`

### テスト
- **テスト実行**: `composer test` (または `php artisan test`)

### コード品質・スタイル
- **コード整形 (Laravel Pint)**: `vendor/bin/pint`

## 機能要件

### お問い合わせフォーム
- 「名前」「メールアドレス」「件名」「本文」を入力して送信する。
- 送信前の「確認画面」有り
- 送信後には「お問い合わせありがとうございました」の出力

### 管理ページ
- お問い合わせの一覧表示をする
- 一覧でクリックしたら詳細が表示される
- ステータスの管理機能がある「新規」「対応中」「解決済み」の3段階をドロップダウンリストで変更できる

## コーディング規約
- PSR-12に準拠
- コメントは日本語

## 作業ルール
- 変更前に必ずgit commitすること