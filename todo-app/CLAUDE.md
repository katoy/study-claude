# CLAUDE.md - ToDo App 開発ガイド

## 技術スタック・制約

- **単一HTMLファイル** (`index.html`): CSS・JavaScript をすべてインラインで記述
- **外部ライブラリ**: 
  - Quill (リッチテキストエディタ) を CDN から読み込み
  - Google Fonts (Plus Jakarta Sans, Noto Sans JP) を CDN から読み込み
- **データ永続化**: localStorage（キー: `todo-app-items`）
- **デザイン**: Corporate Intelligent Dark Aesthetic (Glassmorphism、グラデーション、CSS Variables)
- **サーバー不要**: ブラウザで直接開いて動作（ローカルサーバー経由の動作を推奨）

## コマンド

### ローカルサーバーの起動 (Secure Contextの確保用)
`crypto.randomUUID()` を正常に動作させ、テスト環境との競合を防ぐため、デフォルトポート `8123` を使用してローカルサーバーを起動することを推奨します。

```bash
# npmスクリプトを使う場合
npm run serve

# 直接起動する場合（playwright.config.js の設定に一致）
npx http-server -p 8123
```

### 自動テストの実行
E2Eテストには Playwright (Node.js) を使用します。

```bash
# テストの実行 (ヘッドレスブラウザ)
npx playwright test

# UIモードでのテスト実行 (デバッグ用)
npx playwright test --ui
```

## FILE構成

```
todo-app/
├── index.html              # アプリ本体（HTML + CSS + JS 全て含む）
├── docs/
│   ├── spec.md             # 仕様書
│   ├── main.jpg            # メイン画面ワイヤーフレーム (スケッチ)
│   ├── detail.jpg          # 詳細画面ワイヤーフレーム (スケッチ)
│   └── test-case.md        # テストケース定義（参考）
├── tests/
│   └── todo.spec.js        # E2E テスト（Playwright）
├── package.json            # NPM設定
├── playwright.config.js    # Playwright設定
├── CLAUDE.md               # このファイル
└── README.md               # プロジェクト説明
```

## コーディング規約

- **UI言語**: すべて日本語
- **コメント**: 日本語で記述
- **変数名・関数名**: 英語（キャメルケース）
- **CSS**: `<style>` タグ内に記述
- **JavaScript**: `<script>` タグ内に記述（`</body>` 直前）
- **ID生成**: `crypto.randomUUID()` を使用。ただし `file://` プロトコルなどセキュアなコンテキスト以外で `crypto.randomUUID` が使えない場合に備え、以下のようなカスタムのUUID v4フォールバックロジックを実装すること。

```javascript
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバックロジック
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
```

## セキュリティ & 安全性規約

### XSS（クロスサイトスクリプティング）対策

- **タイトル入力**: 常に `textContent` で DOM に挿入し、HTML エスケープを強制する。`innerHTML` は使用しない
- **Quill エディタ（詳細欄）**: 
  - ツールバーは太字・イタリック・下線・リスト機能のみに制限
  - `dangerouslyPasteHTML()` の入力は Quill が内部的にフィルタリング
  - localStorage からの復元時も同様にフィルタリングが適用される
- **localStorage からのデータ復元**: `JSON.parse()` を try-catch でラップし、パース失敗時は空配列にリセット
- **オブジェクト構造検証**: localStorage から復元したデータが配列であることを確認

### localStorage の制限と注意事項

- **ローカル専用**: localStorage はブラウザのオリジン内でのみアクセス可能
- **サイズ制限**: 通常 5-10MB の制限がある。この TODO アプリでは通常使用範囲内
- **データ完全性の前提**: localStorage のデータが外部から改ざんされないことを前提としている
- **シークレットモード**: シークレット・プライベートブラウジングモードでは localStorage がセッション終了時にクリアされる可能性がある

### CDN と外部ライブラリ

- **Quill 2.x**: ツールバー設定で安全なタグ（b, i, u, li, ol）のみを許可
- **Google Fonts**: HTTPS でのみ読み込み。CDN 障害時はシステムフォントにフォールバック
- **バージョンピン**: Quill は `@2` ワイルドカード指定。セキュリティアップデートは定期的に確認すること

### 入力値バリデーション

- **タイトル**: 空文字・空白のみ・100文字超過をバリデーション（エラー表示）
- **詳細**: プレーンテキスト換算で 2000 文字超過をバリデーション
- **日付**: ブラウザネイティブのカレンダーポップアップで形式を制限
- **バリデーション失敗時**: 保存操作は実行されず、エラーメッセージを表示

## 自動テスト規約 (Playwright)

- **テスト配置**: `tests/` ディレクトリ配下に `*.spec.js` として格納する
  - 現在: `tests/todo.spec.js`
- **対象**: `index.html` にローカルサーバー経由（デフォルト `http://localhost:8123`）でアクセスしてテストを行う
- **データ分離**: 各テストの実行前に `localStorage.clear()` を行い、テスト間の依存を排除する
- **操作検証**: 登録・更新・削除・タブ切り替え等のインタラクションおよびバリデーション表示が仕様書通りに機能することを確認する
- **カバレッジ**: 実装したすべてのJavaScriptコードに対してテストカバレッジ 99.5%以上（ステートメント、ブランチ、関数、行。V8の軽微な計測制限を除く実質100%）を達成し、維持すること
- **日付処理**: 時間境界値テストの失敗（JST/UTCのズレ）を防ぐため、テスト内の日付生成にはローカルタイムゾーンを考慮したヘルパー関数を使用する


## Quill & Google Fonts CDN

### Quill

```html
<link href="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js"></script>
```

ツールバー構成: 太字、イタリック、下線、箇条書きリスト、番号付きリスト

### Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
```

- **Plus Jakarta Sans**: 見出しと英数フォント用（主にUI要素）
- **Noto Sans JP**: 日本語フォント用

## localStorage

- キー: `todo-app-items`
- 値: ToDoアイテムのJSON配列
- 読み書きは `JSON.parse` / `JSON.stringify` で行う

## 仕様書

詳細な仕様は `docs/spec.md` を参照。
