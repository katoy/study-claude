# CSVエクスポート機能の実装計画

## 1. 概要
管理画面のお問い合わせ一覧に、現在の検索・絞り込み条件（キーワード、ステータス、日付範囲）およびソート条件に一致するお問い合わせデータをCSV形式でダウンロードできる機能を追加する。
外部ライブラリは使用せず、PHP標準機能とLaravelの `StreamedResponse` を用いて、メモリ効率の良いシンプルな実装を目指す。

## 2. 仕様・要件
- **文字エンコーディング**: UTF-8 with BOM (Excelでの文字化け防止)
- **CSV項目**: ID, 名前, メールアドレス, 件名, 本文, ステータス(日本語/英語のローカライズ), 登録日時
- **エクスポート対象**: 現在の絞り込み・ソート条件に一致する全件（ページネーションは無視）
- **上限設定**: メモリおよびレスポンスタイムアウト制限を考慮し、最大 10,000 件までとする。10,000件を超える場合はエクスポートを行わずエラー画面（422）を表示する。
- **レート制限**: 同一ユーザーからの過度なエクスポートを防ぐため、Laravel標準の `throttle` ミドルウェアを適用する（例: 1分間に2回まで）。
- **CSVインジェクション対策**: `=`, `+`, `-`, `@` などの特定の記号や、全角の `＝`, `＋`, `－`, `＠` で始まる入力フィールドには、先頭にタブ文字 `\t` を付与して安全にダブルクォートで囲む。

## 3. 実装方針

### SQLite 設定
並行書き込み中の読み取りロック競合を緩和するため、`config/database.php` で SQLite の `busy_timeout` を `5000` msに、`journal_mode` を `WAL` に設定する（既存のSQLite接続設定に追記）。

### ルーティング
- パス: `GET /admin/contacts/export`
- 名前: `admin.contacts.export`
- ミドルウェア: `auth`, `can:manage-contacts`, `throttle:2,1` (1分間に2回)
- 定義位置: `routes/web.php` の管理者グループ内（`contacts` リソースルートの手前に配置して衝突を防ぐ）

### コントローラー処理 (`Admin\ContactController::export`)
1. リクエストパラメータから検索・ソートフィルターを取得し正規化する（既存の `normalizeFilters()` を利用）。
2. 条件に一致するお問い合わせの件数を `count()` で取得。
3. 10,000件を超える場合は、エクスポートを行わずに専用のエラービュー（422）を返す。
4. 10,000件以下の場合は、`ContactCsvExporter` サービスを呼び出して `StreamedResponse` を返却する。
5. 共通のクエリビルダーメソッドを用意し、一覧画面 (`index`)、詳細画面 (`show` の前後ナビゲーション)、エクスポート (`export`) でソート順（選択ソートキー + `id`）を統一する。

### CSVエクスポートサービス (`ContactCsvExporter`)
- 一時ファイルを使用せず、`php://output` へのストリーム書き込みを行う。
- UTF-8のBOM `"\xEF\xBB\xBF"` を最初に出力する。
- ローカライズされたヘッダー行を出力する。
- クエリは `cursor()` を利用して1件ずつ取得し、各フィールドにCSVインジェクション対策を施した上で `fputcsv` で出力する。これによりメモリ消費を最小限に抑える。

### 監査ログ
個人情報へのアクセスを記録するため、CSVエクスポート実行時に Laravel の `Log` ファサードを用いて、実行した管理者ID、絞り込み条件、出力件数をログ（`Log::info`）に出力する。

### エラー画面
件数上限（10,000件）を超えた場合に表示するシンプルなビュー `resources/views/admin/contacts/export-limit-exceeded.blade.php` を作成する（HTTPステータスは 422）。「条件を絞り込んで再実行してください」という案内と、一覧に戻るボタンを配置する。

## 4. UI変更
- `resources/views/admin/contacts/_list.blade.php` の集計行（「全 :count 件」が表示されている領域）の右側に「CSVエクスポート」ボタンを追加する。
- ボタンのリンクには現在の絞り込み条件（`$exportQuery`）をクエリパラメータとして引き継ぐ（ページネーションパラメータは除外）。
- 0件の場合でもヘッダーのみのCSVを取得できるよう、ボタンは常時表示する。

## 5. 翻訳追加
`resources/lang/en.json` に必要な翻訳を追加する。
- `"CSVエクスポート": "Export CSV"`
- `"CSVエクスポート上限を超えました": "CSV export limit exceeded"`
- `"条件を絞り込んで再実行してください。": "Please narrow down the search conditions and try again."`

## 6. テスト計画

### 認証・認可
- `test_unauthenticated_user_cannot_export_csv`: 未ログイン時はログイン画面にリダイレクトされること。
- `test_authenticated_non_admin_user_cannot_export_csv`: 権限のない一般ユーザーは 403 エラーになること。

### フィルターとソートの動作
- `test_export_csv_respects_filters`: 指定したフィルター（ステータス、キーワード、日付範囲など）に一致するデータのみが出力されること。
- `test_export_csv_respects_sort_order`: 一覧画面と全く同じソート順（同一ソートキー時の `id` によるタイブレーカー順を含む）でCSVが出力されること。

### 安全性と制限
- `test_csv_export_rate_limit`: 同一ユーザーが制限回数（毎分2回）を超えてアクセスした際に 429 エラーになること。
- `test_export_csv_rejects_more_than_limit`: 10,000件を超える場合はCSVダウンロードを行わず、422エラー画面が表示されること（テストでは一時的に上限設定を小さくして検証）。
- `test_export_csv_sanitizes_dangerous_prefixes`: `=`, `+`, `-`, `@` などの記号で始まる値が適切にサニタイズ（先頭にタブを付与）されて出力されること。

### レスポンスとエンコーディング
- `test_export_csv_metadata`: レスポンスヘッダーに `Content-Type: text/csv`、`Cache-Control: no-store, private`、`X-Content-Type-Options: nosniff` が設定されていること。
- `test_export_csv_has_utf8_bom`: CSVの先頭に UTF-8 の BOM が付与されていること。
