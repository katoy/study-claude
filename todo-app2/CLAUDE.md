# CLAUDE.md — ToDoアプリ開発指針

**重要**：このファイルは本プロジェクト（HTML + JavaScript単一ファイルアプリ）専用の開発指針です。ホームディレクトリの `~/.claude/CLAUDE.md`（グローバル設定、Python規約）とは独立しており、本プロジェクトではこのファイルを優先します。Python プロジェクト向けのグローバル規約は本プロジェクトに適用されません。

---

## プロジェクト概要

`docs/spec.md` を一次情報源（Single Source of Truth）とします。実装中に疑問が生じた場合は、必ずこのドキュメントを確認してください。

- **型**：ブラウザ用 HTML + JavaScript（サーバー不要）
- **成果物**：単一の `dist/index.html`（CSS/JS インライン化）
- **開発方式**：`src/` 配下をモジュール分割 → Vite でビルド
- **データ保存**：localStorage
- **想定ユーザー**：単一ユーザー・単一ブラウザ

---

## 技術スタック

| 領域 | 技術 | 備考 |
|---|---|---|
| 言語 | Vanilla JavaScript (ES Modules) | TypeScript は不採用 |
| ランタイム | Node.js 20.x LTS以上 | `.nvmrc` で固定 |
| ビルド | Vite + vite-plugin-singlefile | 単一HTML化 |
| テスト | Vitest (jsdom) + @vitest/coverage-v8 | 設定最小化、Jest互換API |
| DOM統合テスト | @testing-library/dom | 可読性高いクエリ |
| リッチエディタ | Quill 2.x | 装飾系のみ（画像埋め込み不可） |
| XSS対策 | DOMPurify | allowlist方式 |
| Lint | ESLint(flat config) + eslint-plugin-no-unsanitized | innerHTML 未サニタイズ検出 |
| Format | Prettier | ESLint と共存（eslint-config-prettier） |
| パッケージマネージャ | npm | package-lock.json で固定 |
| CI/CD | GitHub Actions | lint/test/build(全PR/push) + Pages デプロイ(mainマージ時) |

**TypeScript を採用しない理由**：「HTML + JavaScript」の要件と単純さ優先の方針に合致。型が必要な箇所は JSDoc で補うことで十分。

---

## ディレクトリ構成

実装時に従う推奨構成（詳細は `docs/spec.md` の Project Structure セクション参照）：

```
todo-app2/
├── src/
│   ├── index.html, main.js, constants.js, styles/main.css
│   ├── models/todo.js                      # ToDo オブジェクト操作
│   ├── storage/todoRepository.js           # localStorage 読み書き
│   ├── logic/{sections.js, sort.js, validation.js}  # 純粋ロジック
│   ├── date/dateFormat.js                  # 日時変換
│   ├── sanitize/sanitizeHtml.js            # XSS対策
│   ├── editor/richEditorAdapter.js         # Quill ラッパー
│   └── ui/{mainView.js, detailView.js, charCounter.js}  # UI操作
├── tests/
│   ├── unit/{logic/,date/,storage/,sanitize/,models/}
│   ├── integration/{mainView.test.js, detailView.test.js}
│   └── setup.js                            # jsdom セットアップ
├── .github/workflows/ci-cd.yml
├── vite.config.js, eslint.config.js, .prettierrc, .nvmrc
├── package.json, package-lock.json, .gitignore
├── docs/{spec.md, _prompt.txt, main.jpg, detail.jpg}
├── CLAUDE.md (本ファイル)
└── README.md (任意)
```

---

## コマンド一覧

| コマンド | 用途 |
|---|---|
| `npm ci` | 依存インストール（CI用）|
| `npm run dev` | 開発サーバー起動（HMR） |
| `npm run build` | ビルド（`dist/index.html` 生成） |
| `npm run preview` | ビルド成果物をローカルプレビュー |
| `npm test` | Vitest 単発実行 |
| `npm run test:watch` | Vitest ウォッチモード |
| `npm run test:coverage` | カバレッジ計測（100%閾値強制） |
| `npm run lint` | ESLint（チェックのみ） |
| `npm run lint:fix` | ESLint 自動修正 |
| `npm run format` | Prettier（チェックのみ） |
| `npm run format:fix` | Prettier 自動整形 |

---

## コーディング規約（JavaScript/HTML/CSS）

### 言語・構文

- **ES Modules のみ**：`import` / `export` を使用。CommonJS は使用禁止
- **TypeScript は不採用**：JSDoc でタイプヒントを補う（例：`/** @param {string} name */`）
- **変数宣言**：`const` 優先、再代入が必要な場合のみ `let`。`var` は禁止

### 命名規則

- **変数・関数**：camelCase（例：`getTodoList`, `isCompleted`）
- **真偽値**：`is` / `has` 接頭辞（例：`isVisible`, `hasError`）
- **イベントハンドラ**：`handle` / `on` 接頭辞（例：`handleSave`, `onTabChange`）
- **定数**：UPPER_SNAKE_CASE（例：`MAX_TITLE_LENGTH = 100`。マジックナンバーは `src/constants.js` に集約）
- **クラス・コンストラクタ**：PascalCase（例：`TodoModel`）

### ロジック ↔ UI の分離

**純粋ロジック**（`src/logic/`, `src/date/`, `src/sanitize/`, `src/storage/`, `src/models/`）
- 外部状態（DOM、localStorage）に依存しない
- 入力 → 処理 → 返り値のみで動作定義
- テスト容易性が高い

**DOM操作**（`src/ui/`）
- ロジック層を呼び出して計算を行い、結果を DOM に反映
- UI固有の副作用を明示する命名（例：`renderMainView`, `updateListDisplay`）

**悪い例**（混在）：
```javascript
// ❌ NG: ロジックと UI が混在
function saveAndUpdateDisplay(title) {
  const todo = { title, createdAt: new Date() };
  const json = JSON.stringify(todo);
  localStorage.setItem('todo', json);
  document.getElementById('list').innerHTML = todo.title; // DOM操作
}
```

**良い例**（分離）：
```javascript
// ✅ OK: ロジック層
function createTodo(title) {
  return { title, createdAt: new Date().toISOString() };
}

// ✅ OK: UI層がロジックを呼び出す
function saveAndUpdateDisplay(title) {
  const todo = createTodo(title);
  todoRepository.save(todo);
  renderMainView();
}
```

### HTML / DOM 操作のセキュリティ

**ルール**：`innerHTML` / `outerHTML` への文字列代入は **必ず `sanitizeHtml()` ラッパー経由** で行うこと。

**強制機構**：ESLint の `eslint-plugin-no-unsanitized` が自動検出し、ルール違反でエラーとします。

```javascript
// ❌ NG: 直接代入（ESLint でエラー）
element.innerHTML = userInput;

// ✅ OK: sanitizeHtml() 経由（ESLint でパス）
element.innerHTML = sanitizeHtml(userInput);
```

### コメント

- **言語**：日本語（グローバル CLAUDE.md のルール継承）
- **内容**：WHY（なぜか）を説明することに注力。WHAT（何をしているか）は良い命名で示す
- **形式**：1行は `//`、複数行の補足は JSDoc を活用

```javascript
// ✅ 良い例（WHY を説明）
// JST 暦日が変わる 0 時を UTC 時刻で検出するため、正午 UTC で統一
function daysBetween(fromDateStr, toDateStr) { ... }

// ❌ 悪い例（WHAT のみ）
// 日付の日数差を計算する
function daysBetween(fromDateStr, toDateStr) { ... }
```

### その他

- マジックナンバー（100文字, 2000文字など）は `src/constants.js` に集約
- 1関数1責務：関数は1つの明確な目的を持つ

---

## TDD の回し方

実装は必ず以下のサイクルで進める：

1. **Red（失敗するテストを書く）**
   - `docs/spec.md` の該当仕様を確認
   - 失敗するテストを1つ書く（`src/**/*.test.js` に）
   
2. **Green（最小実装で通す）**
   - テストを通す最小限の実装を書く
   - 過剰な実装は避ける
   
3. **Refactor（コードを整理）**
   - 重複排除、変数名改善など
   - `npm run lint` で警告/エラーを0にする
   
4. **日時ロジック特有の追加検証**
   - JST 日付が変わる境界（UTC 14:59:59 ↔ 15:00:00）を複数ケースで必ずテスト
   - `vi.setSystemTime()` でテスト時刻を固定
   
5. **カバレッジ確認**
   - `npm run test:coverage` で `src/` 自作コードが 100% を達成していることを確認
   - 未カバー行があれば、その行をカバーするテストを追加

```javascript
// 例：日時境界のテストケース
describe('JST 日付判定', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should classify July 24 as today when JST=July 24 09:00', () => {
    // JST 2026-07-24 09:00 = UTC 2026-07-24 00:00
    vi.setSystemTime('2026-07-24T00:00:00Z');
    const sections = buildSections(todos, () => true);
    assert(sections[0].label === '本日中');
  });

  it('should classify July 25 as tomorrow when JST=July 24 23:59', () => {
    // JST 2026-07-24 23:59 = UTC 2026-07-24 14:59
    vi.setSystemTime('2026-07-24T14:59:59Z');
    const sections = buildSections(todos, () => true);
    assert(sections[0].label === '本日中'); // まだ本日
  });

  it('should classify July 25 as tomorrow when JST=July 25 00:00', () => {
    // JST 2026-07-25 00:00 = UTC 2026-07-24 15:00
    vi.setSystemTime('2026-07-24T15:00:00Z');
    const sections = buildSections(todos, () => true);
    assert(sections[0].label === '明日まで'); // 日が変わった
  });
});
```

---

## テスト方針

### カバレッジ 100% の目標

- **対象**：`src/` 配下の自作コード（純粋関数・UI操作）
- **除外**：`node_modules/`（Quill, DOMPurify 等ベンダーライブラリ）
- **計測**：`npm run test:coverage` で statements/branches/functions/lines の4指標が 100%
- **強制**：GitHub Actions で 100% 未満の場合はビルド失敗

### Quill のテスト

Quill はブラウザの `contenteditable` に依存しており、jsdom との完全互換性が限定的です：

- **`richEditorAdapter.js` を薄いインターフェース層として作成**：
  ```javascript
  export function getEditorHTML() { return quill.root.innerHTML; }
  export function setEditorHTML(html) { quill.root.innerHTML = html; }
  export function getEditorText() { return quill.getText(); }
  export function onChange(callback) { quill.on('text-change', callback); }
  ```
  
- **ユニットテスト時**：上記インターフェースをフェイク実装に差し替え
  ```javascript
  // テスト内で
  vi.mock('../editor/richEditorAdapter', () => ({
    getEditorHTML: vi.fn(() => fakeHtml),
    setEditorHTML: vi.fn(),
    // ...
  }));
  ```
  
- **実 Quill への統合テスト**：任意のスモークテスト（カバレッジ対象外）として手動実行可能にする

### localStorage のテスト

各テストの `beforeEach` で `localStorage.clear()` を実行し、テスト間で状態が混在しないようにする：

```javascript
beforeEach(() => {
  localStorage.clear();
  // 必要に応じてダミーデータを設定
});

it('should save and retrieve todo', () => {
  const todo = { id: '123', title: 'Test' };
  todoRepository.save(todo);
  const retrieved = todoRepository.getById('123');
  assert.deepEqual(retrieved, todo);
});
```

### テスト構成例

```
tests/
├── unit/
│   ├── logic/sections.test.js         # セクション分類ロジック
│   ├── date/dateFormat.test.js        # 日時フォーマット、UTC⇔JST変換
│   ├── storage/todoRepository.test.js # localStorage 読み書き
│   ├── sanitize/sanitizeHtml.test.js  # DOMPurify ラッパー
│   └── models/todo.test.js            # ToDo オブジェクト生成
├── integration/
│   ├── mainView.test.js               # jsdom 上でタブ切替、完了操作
│   └── detailView.test.js             # jsdom 上で保存、バリデーション
└── setup.js                            # jsdom 初期化、localStorage クリア
```

---

## ビルド・CI/CD 概要

### ローカルビルド

```bash
npm run build
# → dist/index.html が生成される（CSS/JS インライン化済み）
```

生成されたHTMLはそのままブラウザで開いて動作確認可能：

```bash
npm run preview
```

### GitHub Actions（`.github/workflows/ci-cd.yml`）

**全 push / PR 時**：
1. `npm run lint` — ESLint（0件エラー必須）
2. `npm run test:coverage` — Vitest（カバレッジ 100% 必須）
3. `npm run build` — Vite ビルド成功必須

**`main` ブランチへのマージ時**：
- 上記に加えて GitHub Pages へ自動デプロイ
- Pages 上の公開 URL でアプリにアクセス可能

### ビルド成果物の管理

- **`.gitignore` に `dist/` を追加**：ビルド成果物はリポジトリにコミットしない
- **CI で都度ビルド**：毎回 main コミットからビルドし、Pages にデプロイ
- **履歴クリーン性**：ソースコード変更のみが git 履歴に残る

---

## セキュリティ規約

### 入力値のサニタイズ

- **保存時**：ユーザー入力（特に詳細欄の HTML）を DOMPurify でサニタイズしてから localStorage に保存
- **表示時**：localStorage から読み込んだ値も再度 DOMPurify でサニタイズして DOM に反映
- **二重防御**：保存時と表示時の両方でサニタイズ（ダブルチェック）

```javascript
// ✅ 保存時
const sanitized = sanitizeHtml(userInput);
todoRepository.save({ ...todo, detailHtml: sanitized });

// ✅ 表示時
const todo = todoRepository.getById(id);
element.innerHTML = sanitizeHtml(todo.detailHtml);
```

### localStorage の内容も信頼しない

localStorage は変更可能（ブラウザコンソールから編集可能）なため、読み込み時は防御的にパース：

```javascript
try {
  const data = JSON.parse(localStorage.getItem('todoapp.todos.v1') || '[]');
  // 形式チェック、不正なエントリをフィルタリング
  return Array.isArray(data) ? data.filter(isValidTodo) : [];
} catch (e) {
  console.warn('Failed to parse localStorage:', e);
  return []; // デフォルト値で続行（クラッシュさせない）
}
```

### その他

- **外部ネットワーク通信の追加禁止**：完全クライアントサイド動作を維持
- **`eval()` / `new Function()` は禁止**：動的コード実行リスク
- **CSP(Content Security Policy)**：単一ファイル制約上 `script-src 'unsafe-inline'` を許容し、XSS 対策の主軸は DOMPurify に依存

---

## Always / Ask first / Never

### Always（必ずやること）

- [ ] **実装前に `docs/spec.md` を確認する**
  - 該当仕様、データモデル、ロジック詳細を読み込む
  
- [ ] **テスト先行（Red → Green → Refactor）**
  - 機能を実装するまえに、失敗するテストを書く
  - テストが実装仕様の確認ツール
  
- [ ] **`innerHTML` / `outerHTML` 代入前に必ず `sanitizeHtml()` を通す**
  - ESLint の `eslint-plugin-no-unsanitized` で機械的に検出
  
- [ ] **日時ロジック変更時は JST 日跨ぎ境界のテストを追加**
  - `vi.setSystemTime()` で複数の代表時刻を固定してテスト
  
- [ ] **コミット前に `npm run lint && npm run test:coverage` を実行**
  - Lint エラー/警告 0件
  - カバレッジ 100%（src/ 自作コード対象）

### Ask first（事前に質問すること）

- [ ] **`docs/spec.md` に明記のない仕様判断が必要になったとき**
  - Open Questions セクションに追記した上で、質問する
  
- [ ] **新しい npm パッケージを追加するとき**
  - 依存を増やすことで複雑性が増加する可能性を事前検討
  
- [ ] **カバレッジ 100% 目標を一時的に除外/緩和したいとき**
  - テスト削除/skip ではなく、実装側で対応する
  
- [ ] **localStorage スキーマ（キー名・データ構造）を変更するとき**
  - マイグレーション戦略を検討（`todoapp.todos.v1` の version bump など）
  
- [ ] **Node.js バージョンや主要ビルド設定を変更するとき**
  - CI/開発環境への影響確認

### Never（絶対にやらないこと）

- [ ] **未サニタイズ文字列を `innerHTML` / `outerHTML` に直接代入しない**
- [ ] **`eval()` / `new Function()` を使用しない**
- [ ] **外部サーバーへの通信を追加しない**（完全クライアントサイド維持）
- [ ] **テストを削除/skip してカバレッジ 100% を達成しない**（実装側で対応）
- [ ] **`--no-verify` 等で CI チェックを回避しない**
- [ ] **`dist/` ビルド成果物を直接 commit しない**
- [ ] **ユーザーの明示指示なく `docs/spec.md` を変更しない**（spec 変更は質問ありき）

---

## 参考リンク

- **仕様書**：`docs/spec.md`（絶対的な情報源）
- **元指示**：`docs/_prompt.txt`
- **ラフ画像**：`docs/main.jpg`, `docs/detail.jpg`

---

本プロジェクトの開発では、上記指針に従い、`docs/spec.md` を常に参照しながら進めてください。疑問点や デフォルト値の訂正は、実装前に質問してください。
