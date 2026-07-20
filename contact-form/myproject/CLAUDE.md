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
- **開発サーバー起動**: `composer dev` (Artisan Serve, Vite, Queue, Pailログを `yyyy-MM-dd HH:mm:ss` のタイムスタンプ付きで並列起動)
- **アセットビルド**: `npm run build`

### テスト
- **テスト実行**: `composer test` (または `php artisan test`)

### コード品質・スタイル
- **コード整形 (Laravel Pint)**: `vendor/bin/pint`

### スクリーンショット更新
管理画面や UI に変更があった場合は、スクリーンショットを更新します。以下のコマンドで開発サーバーを起動してスクリーンショットを撮影・置き換えます：

```bash
# 1. 開発サーバーを起動
composer dev

# 2. ブラウザで http://localhost:8000/admin/contacts にアクセスしてログイン
#    （必要に応じて管理者アカウントを作成: php artisan tinker で User::factory()->admin()->create()）

# 3. ブラウザで現在のページのスクリーンショットを確認してから、別のターミナルで実行：
screencapture -x /tmp/admin_dashboard_new.jpg
mv /tmp/admin_dashboard_new.jpg screenshots/admin_dashboard.jpg

# 4. コミット
git add screenshots/admin_dashboard.jpg
git commit -m "refactor: Update admin dashboard screenshot"

# 5. 開発サーバーを停止
kill $(lsof -ti:8000,5173) 2>/dev/null
```

**スクリーンショット一覧:**
- `screenshots/contact_input.jpg` — 公開フォーム入力画面
- `screenshots/contact_confirm.jpg` — 確認画面
- `screenshots/admin_dashboard.jpg` — 管理画面一覧（絞り込み・ソート UI 含む）
- `screenshots/admin_login.jpg` — ログイン画面
- `screenshots/admin_show.jpg` — 詳細・ステータス管理画面

## 機能要件

### お問い合わせフォーム
- 「名前」「メールアドレス」「件名」「本文」を入力して送信する。
- 送信前の「確認画面」有り
- 送信後には「お問い合わせありがとうございました」の出力

### 管理ページ
- お問い合わせの一覧表示をする
- お問い合わせ一覧における多機能絞り込み＆ソート機能:
  - キーワード検索（「名前・メール・件名」および「本文」の個別分離検索）
  - 検索・指定履歴機能（LocalStorage 連携、オートコンプリート、ワンタップ引用、個別 `×` 削除、一括全削除）
  - ステータス絞り込み（新規、対応中、解決済み）およびリアルタイムステータス別件数バッジ表示
  - 登録日範囲検索（ブラウザ標準カレンダーピッカー連動）
  - アコーディオンによる絞り込みエリアの折りたたみ・展開（開閉状態・適用中件数バッジ維持）
- お問い合わせ詳細表示＆ステータス更新機能:
  - 現在の絞り込み・ソート順を維持した「前へ」「次へ」ナビゲーション（「X件中Y件目」表示）
  - ステータスの3段階変更（新規、対応中、解決済み）

### エラー処理・UX
- バリデーションエラーメッセージは日本語（各 FormRequest の `messages()` で定義）
- DB登録などの処理は `DB::transaction` と `try-catch` で囲み、例外時は `Log::error` を記録してフォールバック（withInput 等）する
- 二重送信（重複登録）はフロントエンド（送信ボタン非活性化）とバックエンド（セッションの `pull()`）の両方で防止する
- カスタムエラー画面（403, 404, 429, 500）を用意し、共通の公開レイアウトを適用する

## コーディング規約
- PSR-12に準拠
- コメントは日本語

## 作業ルール
- 変更前に必ずgit commitすること
- テストカバレッジ 100% を維持（keep）すること（現在全81テスト PASS & カバレッジ100.0%）
- エラー処理およびセキュリティのレビューを忘れないこと

## デプロイ検討メモ
- **GitHub Pages**:
  - 静的ホスティングのため、LaravelのPHP/DB処理はそのままでは動作不可。
  - 対策案：フロントエンドのみ静的化して配置し、送信先を外部のフォームSaaS（Formspree等）にするか、別サーバーのAPIを叩く構成にする。
- **Google Cloud (Cloud Run)**:
  - コンテナ化（Docker）によるデプロイが可能。リクエスト時のみ起動するため、低コスト（無料枠あり）で運用可能で最も推奨。
  - データベース（Cloud SQL）は固定費がかかるため、コストを抑える場合は外部の無料DB（Supabase等）と連携させる。