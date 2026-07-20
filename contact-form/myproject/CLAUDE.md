# お問い合わせフォーム

## プロジェクト概要
Laravelで構築したお問い合わせフォーム。公開側の入力・確認・送信フローと、管理者向けの一覧検索・詳細確認・ステータス更新を提供する。

## 技術仕様
- **Backend**: Laravel 13.x (PHP 8.3+)
- **Frontend**: Vite 8.x, Tailwind CSS 3.4.x, Alpine.js 3.x
- **Database**: SQLite (`database/database.sqlite`)

## 主要コマンド

### 開発・ビルド
- **環境セットアップ**: `composer setup` (依存関係の解決、`.env` の生成、キー生成、マイグレーション、アセットビルドを一括実行)
- **開発サーバー起動**: `composer dev` (Artisan Serve, Vite, Queue, Pailログを `yyyy-MM-dd HH:mm:ss` のタイムスタンプ付きで並列起動)
- **ダミーデータ投入**: `php artisan db:seed` (管理者アカウント `AdminUserSeeder` および 100件のお問い合わせ `ContactSeeder` を一括実行)
- **アセットビルド**: `npm run build`

### テスト
- **テスト実行**: `composer test` (または `php artisan test`)
- **カバレッジ測定**: `php artisan test --coverage`（全クラス 100.0% を維持）

### コード品質・スタイル
- **コード整形 (Laravel Pint)**: `vendor/bin/pint`
- **整形チェック**: `vendor/bin/pint --test`

### スクリーンショット・操作デモ更新
管理画面や UI に変更があった場合は、関連するスクリーンショットおよび操作デモ GIF アニメーションを更新する。

```bash
# 1. ダミーデータを用意して開発サーバーを起動
php artisan db:seed
composer dev
```

- **静的スクリーンショット (JPEG)**:
  - 表示領域 `1280x800`、device scale factor `2`、ロケール `ja-JP`、ダークテーマに統一して撮影する（JPEG 画像サイズ `2560x1600`）。
  - 公開フォームは入力例を入れた確認画面まで、管理画面はシーダーの管理者でログインして一覧・詳細を撮影する。

- **操作デモ GIF アニメーションの作成方法**:
  - **ツール構成**: Python の `playwright` ライブラリでブラウザ操作とフレーム撮影を行い、`ffmpeg` でパレット最適化 GIF へ変換する。
  - **カーソル移動・クリックの可視化技術**:
    - `page.evaluate()` を使用して DOM 上にカスタムマウスポインター（赤色の円形オーバレイ `#custom-mouse-pointer`）と波紋エフェクト用 CSS (`custom-ripple`) を注入する。
    - 各操作要素（フォーム入力欄、ボタン、チェックボックス、詳細リンク等）のバウンディングボックス (`bounding_box()`) 座標を計算し、ポインターを目的の座標へ段階的に滑らか移動 (`moveCustomPointer(x, y)`) させてからクリック発火 (`clickCustomPointer(x, y)`) することで、カーソル位置とクリック動作をアニメーション上で明瞭に可視化する。
  - **FFmpeg コマンド（高画質・軽量化パレット最適化）**:
    ```bash
    ffmpeg -y -framerate 8 -i frame_%04d.png \
      -vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
      screenshots/demo_public_form.gif
    ```

**スクリーンショット・操作デモ一覧:**
- `screenshots/contact_input.jpg` — 公開フォーム入力画面（ダークモード）
- `screenshots/contact_confirm.jpg` — 確認画面（ダークモード）
- `screenshots/admin_dashboard.jpg` — 管理画面一覧（絞り込み・ソート UI 含む、ダークモード）
- `screenshots/admin_login.jpg` — ログイン画面（ダークモード）
- `screenshots/admin_show.jpg` — 詳細・ステータス管理画面（ダークモード）
- `screenshots/demo_public_form.gif` — 公開フォーム操作アニメーション（カーソル・クリック波紋演出付き GIF）
- `screenshots/demo_admin_dashboard.gif` — 管理画面操作・テーマ切り替えアニメーション（カーソル・クリック波紋演出付き GIF）

## 機能要件

### お問い合わせフォーム
- 「名前」「メールアドレス」「件名」（各必須・最大255文字）と「本文」（必須・最大2000文字）を入力して送信する。メールアドレスは有効な形式であること。
- 全入力項目で文字数をリアルタイム表示する。JavaScript は `Array.from()`、サーバーは `mb_strlen()` を使用し、絵文字を含む Unicode コードポイント単位で判定を一致させる。
- 最大文字数を超えた場合はカウンターおよび入力欄の枠線・文字色を赤色警告表示し、`aria-invalid`、説明、エラーを入力欄へ関連付ける。
- 送信前の「確認画面」有り
- 送信後には「お問い合わせありがとうございました」の出力

### 管理ページ
- お問い合わせの一覧表示をする（各お問い合わせカード枠の左外側にページ跨ぎ対応のシーケンス番号（`1`, `2`, ... 数字のみ）を表示、一覧の上下両方のページネーションコントロールのすぐ左隣に表示件数切り替えを配置）
- お問い合わせ一覧における多機能絞り込み＆ソート機能:
  - 1ページあたり表示件数切り替え（5件、10件、20件【デフォルト】、50件、100件、200件、ページネーションボタンのすぐ左隣および絞り込みフォームで操作可能）
  - キーワード検索（「名前・メール・件名」および「本文」の個別分離検索）
  - 検索・指定履歴機能（LocalStorage 連携、オートコンプリート、ワンタップ引用、個別 `×` 削除、一括全削除）
  - ステータス複数選択チェックボックス絞り込み（新規、対応中、解決済み。未選択および全選択時は全件対象）およびリアルタイムステータス別件数バッジ表示
  - 登録日範囲検索（ブラウザ標準カレンダーピッカー連動）
  - アコーディオンによる絞り込みエリアの折りたたみ・展開（初回は `sm` 未満で閉じ、`sm` 以上で開く。以後は開閉状態・適用中件数バッジを維持）
- お問い合わせ詳細表示＆ステータス更新機能:
  - 現在の絞り込み・ソート順を維持した「前へ」「次へ」ナビゲーション（「X件中Y件目」表示）
  - 詳細表示、ステータス更新、一覧へ戻る操作でも `page` と `per_page` を保持
  - ステータスの3段階変更（新規、対応中、解決済み）
- 登録日時の表示表記統一:
  - 全画面で `2026-07-20 (月) 09:13` （`YYYY-MM-DD (ddd) HH:mm`）形式に統一して表示
- テーマ切り替え機能:
  - ヘッダー右端に統一配置されたテーマ切替ボタン（`<x-theme-toggle />`）でライト／ダークテーマを全画面でトグル可能

### データベース・シーダー
- **ContactSeeder**: 日本人の名前（男女混合）、`example.com` ドメインのメールアドレス、ショッピングサイトを想定したお問合せ（配送、注文変更、商品質問、領収書発行、返品、二重決済、大口見積等）のダミーデータ 100 件を、短文・中文・長文・多段落箇条書き等の豊富な長さバリエーションおよび過去60日間のランダム日時・各種ステータスで投入する。

### エラー処理・UX・多言語対応
- バリデーションエラーメッセージは日本語（各 FormRequest の `messages()` で定義）
- 画面上の全テキストラベルおよびページネーションリンク (`pagination.previous`, `pagination.next`) を `__()` ヘルパーでラッピングし、英語・日本語の多言語翻訳ファイル（`resources/lang/en.json`, `resources/lang/ja.json`, `resources/lang/ja/pagination.php`, `resources/lang/en/pagination.php`）を完備。
- DB登録などの処理は `DB::transaction` と `try-catch` で囲み、例外時は `Log::error` を記録してフォールバック（withInput 等）する
- 二重送信（重複登録）はフロントエンド（送信ボタン非活性化）とバックエンド（セッションの `pull()`）の両方で防止する
- カスタムエラー画面（403, 404, 429, 500）を用意し、共通の公開レイアウトを適用する
- ブランド統一アイコン SVG (`application-logo.blade.php`, `public/favicon.svg`) を新設し、アプリ画面左上およびブラウザ Favicon に適用

### UI・アクセシビリティ・CSS
- モバイルファーストで実装し、`320px` でも横スクロールを発生させない。主要な操作要素は原則 `44px` 以上のタップ領域を確保する。
- ナビゲーション、絞り込み、文字数カウンター、エラー、ページネーションには適切な `aria-label`、`aria-controls`、`aria-expanded`、`aria-describedby`、`aria-live` を付与する。
- `prefers-color-scheme` によるライト／ダークテーマと、`prefers-reduced-motion` によるモーション抑制に対応する。
- ブランドカラーは `resources/css/app.css` の CSS カスタムプロパティで定義し、`tailwind.config.js` の `brand.*` トークンから利用する。文字・リンク用の `brand-primary` と、白文字を載せる背景用の `brand-action` を混同しない。
- ページネーションは `resources/views/vendor/pagination/tailwind.blade.php` を使用し、日本語表示、現在ページ、無効状態、44px 操作領域を維持する。
- Tailwind CSS は v3 系に統一する。v4 用の `@tailwindcss/vite` や、設定に存在しないユーティリティクラスを追加しない。

## コーディング規約
- PSR-12に準拠
- コメントは日本語

## 作業ルール
- 変更前に必ずgit commitすること
- テストカバレッジ 100% を維持（keep）すること（2026-07-20 時点で全97テスト・292アサーション PASS、カバレッジ100.0%）
- git commit を行う際は、UI・ビュー・データ等の変更によりスクリーンショットの更新が必要かを判断し、必要な場合は必ず撮影・更新してから commit すること
- エラー処理およびセキュリティのレビューを忘れないこと

## デプロイ検討メモ
- **GitHub Pages**:
  - 静的ホスティングのため、LaravelのPHP/DB処理はそのままでは動作不可。
  - 対策案：フロントエンドのみ静的化して配置し、送信先を外部のフォームSaaS（Formspree等）にするか、別サーバーのAPIを叩く構成にする。
- **Google Cloud (Cloud Run)**:
  - コンテナ化（Docker）によるデプロイが可能。リクエスト時のみ起動するため、低コスト（無料枠あり）で運用可能で最も推奨。
  - データベース（Cloud SQL）は固定費がかかるため、コストを抑える場合は外部の無料DB（Supabase等）と連携させる。
