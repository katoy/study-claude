# Spec: ToDoアプリ

## 前提条件の注記

元指示の「日時の表記は 2026-07-24 (壁) ちすること」は「(火)」＝曜日表示、「とすること」の誤字と解釈し、**日付表記に曜日を含める仕様**として扱います（例: `2026-07-24 (火)`）。詳細は「10. Open Questions / 前提条件」の #1 を参照してください。

---

## 1. Objective（目的）

本アプリは、個人用の ToDo（タスク）管理をブラウザだけで完結させるための単機能なウェブアプリケーションです。

**主要特性**:
- サーバー不要：クライアントサイドのみで動作
- 単一デバイス・単一ユーザー：複数デバイス間の同期は行わない
- オフライン対応：ネットワーク接続がなくても使用可能
- データ永続化：localStorage にて自動保存

**成果物**:
- `dist/index.html` ：CSS と JavaScript をすべてインライン化した、単一のHTMLファイル
- オフラインで完全に動作する（外部ネットワークリソースへの依存なし）

**開発方式**:
- ソースコードは `src/` 配下にモジュール分割して管理
- ビルドツール（Vite）で最終的に `dist/index.html` に統合
- 「単一HTMLファイル」は **成果物の要件** であり、開発時のソースコードは分割可能

**本仕様書の位置付け**:
このドキュメントはすべての実装判断の一次情報源（Single Source of Truth）です。実装中に疑問が生じた場合は、必ずこの仕様書を確認し、記載されていない場合は開発者が質問してください。

---

## 2. Functional Spec（画面仕様）

### 2.0 ワイヤーフレーム

#### メイン画面

```
┌─────────────────────────────────────────────────────┐
│  TODOリスト                                          │
│  ┌──────────┐                                       │
│  │   新規   │                                       │
│  └──────────┘                                       │
├─────────────────────────────────────────────────────┤
│ ┌────────┬────────┬────────┐    ┌──────────────┐   │
│ │ すべて │ 未完了 │ 完了済 │    │完了済を削除  │   │
│ └────────┴────────┴────────┘    └──────────────┘   │
├─────────────────────────────────────────────────────┤
│ 本日中                                               │
├─────────────────────────────────────────────────────┤
│ タスク 1                    2026-07-24 (火) 09:00  [完了]
│ ~~タスク 2（完了）~~        2026-07-24 (火) 14:00  [未完了]
│                                                     │
├─────────────────────────────────────────────────────┤
│ 明日まで                                             │
├─────────────────────────────────────────────────────┤
│ タスク 3                    2026-07-25 (水)        [完了]
│                                                     │
├─────────────────────────────────────────────────────┤
│ それ以外                                             │
├─────────────────────────────────────────────────────┤
│ タスク 4                    2026-07-29 (日) 18:30  [完了]
│ タスク 5（未設定）          —                      [完了]
│                                                     │
└─────────────────────────────────────────────────────┘
```

**メイン画面の特徴**：
- ヘッダーにアプリタイトル「TODOリスト」と「新規」ボタン
- 3つのフィルタタブ（「すべて」「未完了」「完了済」）
- タブ行右側に「完了済を削除」ボタン
- 一覧は「本日中」「明日まで」「それ以外」の3セクションに区分
- 各行は「タイトル（左）/ 日時（中央）/ 完了ボタン（右）」の3カラムレイアウト
- 完了済み項目は取り消し線とグレー表示

#### 詳細画面（モーダルダイアログ）

```
┌──────────────────────────────────────────┐
│        新規 ToDo 登録                    │ X
├──────────────────────────────────────────┤
│                                          │
│ タイトル                                  │
│ ┌──────────────────────────────────────┐ │
│ │ 明日の買い物リスト           │ 17 / 100│ │
│ └──────────────────────────────────────┘ │
│                                          │
│ 日時                                     │
│ ○ なし                                   │
│ ○ 日のみ    ┌──────────────────────┐   │
│              │ 2026-07-25 (水)     │   │
│              └──────────────────────┘   │
│ ○ 時まで    ┌──────────────────────────┐│
│              │ 2026-07-25 (水) 14:30  │ │
│              └──────────────────────────┘│
│                                          │
│ 詳細                                     │
│ ┌──────────────────────────────────────┐ │
│ │ ツールバー  [B] [I] [U] [S] [◦]      │ │
│ ├──────────────────────────────────────┤ │
│ │ 牛乳、パン、卵を買う               │ │
│ │                                    │ │
│ │                                    │ │
│ │                        125 / 2000  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌────────┐    ┌────────┐                │
│ │  保存  │    │キャンセル│              │
│ └────────┘    └────────┘                │
│                                          │
└──────────────────────────────────────────┘
```

**詳細画面の特徴**：
- `<dialog>` 要素のモーダルダイアログ（ページをオーバーレイ）
- タイトル欄：テキスト入力、文字数カウンター（現在数 / 100）
- 日時欄：ラジオボタン3択（なし / 日のみ / 時まで）で日付/日時ピッカーを表示/非表示
- 詳細欄：Quill リッチエディタ（ツールバーで太字・斜体・下線・取り消し線・箇条書き対応）、文字数カウンター（現在数 / 2000）
- ボタン：「保存」「キャンセル」の2つのみ（削除ボタンなし）

---

### 2.1 メイン画面

#### ヘッダー・新規ボタン

- ページの最上部に **「TODOリスト」** というタイトルを表示
- タイトル直下に **「新規」** ボタンを配置
- 「新規」ボタンをクリックすると、詳細画面が モーダルダイアログ（`<dialog>` 要素）で開き、新規登録モード となります

#### タブ・フィルタ

- 3つのタブ **「すべて」「未完了」「完了済」** を横並びで表示
- **「すべて」タブ**：登録されたすべての ToDo を表示（完了/未完了を問わず）
- **「未完了」タブ**：`completed === false` の ToDo のみを表示
- **「完了済」タブ**：`completed === true` の ToDo のみを表示
- タブはアプリ起動時に「すべて」が選択状態（ブラウザセッション内でユーザーが選択したタブは記憶する、ただし URL には反映しない）
- タブクリック時は即座に一覧が再描画される

#### 完了済を削除ボタン

- タブ行の右側に **「完了済を削除」** ボタンを配置
- 「完了済」タブで `completed === true` のすべての項目を一括削除する操作
- クリック時に確認ダイアログを表示し、「削除」「キャンセル」を選ばせる（不可逆操作のため）
- 削除対象が0件の場合はボタンを disabled 状態にする

#### 一覧の見出し（セクション分け）

一覧は以下の3セクションに分けられ、横線（罫線）で区切られます。表示されるセクションは、そのタブに該当する項目を持つもののみです。

1. **「本日中」**：締切日が本日（日本時間）の ToDo
2. **「明日まで」**：締切日が明日（日本時間）の ToDo
3. **「それ以外」**：上記以外のすべての ToDo（締切が期限超過のもの、「日だけ指定」で2日後以降のもの、締切未設定のもの）

セクション内に項目がない場合、そのセクションの見出しは表示されません。

#### 一覧の行レイアウト

各 ToDo は3カラムで表示されます：

| カラム | 内容 | 操作 |
|---|---|---|
| 左（タイトル） | ToDo のタイトル（最大100文字） | クリックで詳細画面をモーダルで開く（編集モード） |
| 中央（日時） | 締切がある場合は日本時間での表記。例:`2026-07-24 (火) 09:00` または `2026-07-24 (火)`。締切がない場合は空欄またはダッシュ `—` を表示 | — |
| 右（ボタン） | **未完了の場合**：「完了」ボタン。**完了済みの場合**：「未完了」ボタン | クリックで完了 ↔ 未完了をトグルし、即座に表示を切り替える |

#### 完了状態の切り替え

- **未完了の行**：「完了」ボタンをクリック → `completed = true` に更新し、表示が「完了済み」に切り替わる
- **完了済みの行**：「未完了」ボタンをクリック → `completed = false` に更新し、表示が「未完了」に切り替わる
- 切り替えは即座に行われ、localStorage に自動保存される

#### 完了済み項目の視覚表現

`completed === true` の行には以下の装飾を施します：

- タイトルに取り消し線（`text-decoration: line-through`）
- 文字色をダークテーマ内でグレーアウト（減光表示）
- ボタンは「未完了」に切り替わり、クリックで再度未完了状態に戻すことが可能

#### ソート順

セクション内での行の順序は以下のルールに従います：

1. **締切ありの項目**：締切時刻（UTC）の昇順（古い＝期限超過→近い将来で自然に整列）
2. **締切なしの項目**：作成日時（`createdAt`）の昇順（登録が古いものが先）
3. 上記のいずれか一方を持つ場合、**締切ありが常に締切なしより前** に表示される

→ 具体例：「それ以外」セクション内で、期限超過の項目 → 2日後の項目 → 1週間後の項目 → 未設定（古い順）という並びになります。

---

### 2.2 詳細画面（モーダルダイアログ）

詳細画面は `<dialog>` 要素を使用したモーダルダイアログとして実装されます。

#### 起動方法

1. メイン画面の「新規」ボタンをクリック → **新規登録モード**（空のフォーム）
2. メイン画面の一覧のタイトルをクリック → **編集モード**（既存データを読み込み）

新規/編集は同一のコンポーネントで実現し、`todoId` の有無でモードを判定します。

#### タイトル欄

- ラベル：「タイトル」
- 入力欄：1行のテキスト入力（`<input type="text">`）
- **最大文字数**：100文字
- **必須項目**：trim後0文字では保存不可
- **文字カウンター**：入力欄の下に「`n / 100`」形式でリアルタイム表示
- 100文字に到達すると、それ以上の入力をブロック（`maxlength` 属性と JavaScript 二重チェック）

#### 日時欄

ラベル：「日時」

日時指定の3パターンをラジオボタンで選択：

1. **「なし」**
   - 締切を指定しない（`dueType = 'none'`、`dueAt = null`）
   - 日付入力欄は非表示/disabled
2. **「日のみ」**
   - 直感的に操作可能な**カレンダー UI（ブラウザ標準のカレンダーピッカー）**を前面に透過配置したカスタム日付ピッカーが右に表示される。
   - 画面表示上は、すべての環境（Safari等を含む）で一貫して `年-月-日`（`YYYY-MM-DD`）の書式でプレースホルダーおよび入力値が表示される。
   - ユーザーがカレンダー UI から選択した日付の JST 23:59:59 を UTC 変換して内部保存（`dueType = 'date'`）。メイン一覧では曜日を含んだ形式（例:`2026-07-24 (火)`）で表示される。
3. **「時まで」**（「時間と分も指定」の意味）
   - カレンダーおよび時刻選択に対応した**カレンダー UI（ブラウザ標準の日時ピッカー）**を前面に透過配置したカスタム日時ピッカーが右に表示される。
   - 画面表示上は、すべての環境で一貫して `年-月-日 時:分`（`YYYY-MM-DD HH:mm`）の書式でプレースホルダーおよび入力値が表示される。
   - ユーザーがカレンダー UI / ピッカーから選択した日時を JST → UTC 変換して内部保存（`dueType = 'datetime'`）。メイン一覧では曜日・時間を含んだ形式（例:`2026-07-24 (火) 09:00`）で表示される。

ラジオボタンを切り替えると、それに対応しない入力欄は disabled かつ値はクリアされ、対応するカレンダー UI のみが有効・表示状態になります。

#### 詳細欄（内容詳細）

- ラベル：「詳細」
- 入力欄：**Quill リッチテキストエディタ** を使用（太字・斜体・下線・取り消し線・箇条書きのみ対応。画像・動画・リンク埋め込みは不可。）
- **最大文字数**：2000文字（プレーンテキスト換算。装飾タグは含めない）
- **任意項目**：空文字を許容（保存可能）
- **文字カウンター**：エディタの下に「`n / 2000`」形式でリアルタイム表示（プレーンテキストベース）
- **保存方式**：Quill が出力した HTML 文字列を DOMPurify でサニタイズし、`detailHtml` として保存

#### ボタン

ダイアログの下部に2つのボタンを配置：

- **「保存」ボタン**
  - バリデーション通過時のみ有効化（タイトルが空でない、など）
  - クリック時の処理：
    - 新規：新しい ToDo オブジェクト（`id`は`crypto.randomUUID()`で生成）を作成、`createdAt`/`updatedAt` に現在のUTCを設定
    - 編集：既存オブジェクトを更新、`updatedAt` のみ更新
    - localStorageに保存
    - メイン画面に戻り、一覧を再描画
- **「キャンセル」ボタン**
  - 変更を破棄してモーダルを閉じる
  - ダイアログ外のクリックでもモーダルは閉じられる

**削除ボタンは配置しない**（ラフ画像に準拠）。個別削除は行わず、メイン画面の「完了済を削除」のみで削除可能です。

---

### 2.3 データモデル

```javascript
// 1件の ToDo オブジェクト
{
  id: string,              // crypto.randomUUID() で生成
  title: string,           // 1～100文字（trim後）、必須
  detailHtml: string,      // DOMPurify でサニタイズ済みHTML、プレーンテキスト換算 0～2000文字、空文字可
  dueType: 'none' | 'date' | 'datetime',  // 日時指定の種別
  dueAt: string | null,    // ISO 8601 UTC文字列（例: "2026-07-24T14:59:59.000Z"）
                            // dueType === 'none' の場合は null
  completed: boolean,      // false: 未完了、true: 完了
  createdAt: string,       // ISO 8601 UTC文字列（作成時刻）
  updatedAt: string,       // ISO 8601 UTC文字列（最終更新時刻）
}
```

**localStorage への保存**:

- キー：`todoapp.todos.v1`（末尾の `.v1` はスキーマバージョンで、将来の migration に備える）
- 値：上記オブジェクトの配列を `JSON.stringify()` したもの

**読み込み時の防御**:

```javascript
try {
  const data = JSON.parse(localStorage.getItem('todoapp.todos.v1') || '[]');
  // 形式チェック、不正なエントリはフィルタリング
} catch (e) {
  console.warn('Failed to parse localStorage:', e);
  // デフォルト値 [] で続行（アプリをクラッシュさせない）
}
```

---

### 2.4 日時の表記・変換ルール

#### 内部保存

すべての日時は **UTC の ISO 8601 形式** で保存されます：

```
"2026-07-24T09:00:00.000Z"
```

#### 画面表示

日本時間（Asia/Tokyo）に変換して表示します：

**日付のみの場合**（`dueType === 'date'`）:
```
2026-07-24 (火)
```

**日時の場合**（`dueType === 'datetime'`）:
```
2026-07-24 (火) 09:00
```

曜日は `weekday: 'short'` で単漢字（月/火/水/木/金/土/日）が取得できます。

#### フォーマット実装例

```javascript
// JST暦日を "YYYY-MM-DD" で取得（en-CA ロケールはISO順）
function toJSTCalendarDate(utcDate) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}

// JST曜日を単漢字で取得
function toJSTWeekday(utcDate) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
  }).format(utcDate);
}

// JST時刻を "HH:MM" で取得
function toJSTTime(utcDate) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(utcDate);
}
```

#### 「日だけ指定」の内部処理

ユーザーが「日のみ」で `2026-07-25` を選択した場合、内部的には **その日のJST 23:59:59** をUTC変換して保存します。これにより：

- 本日中/明日まで/それ以外のセクション判定が正確に行われる
- ソート時に締切時刻の大小比較が機能する
- 表示時には日付のみが表示される（時刻は非表示）

---

## 3. Tech Stack（技術スタック）

| 領域 | 技術 | バージョン/備考 |
|---|---|---|
| **言語** | JavaScript (ES Modules) | TypeScript は不採用 |
| **ランタイム** | Node.js | 20.x LTS以上（.nvmrc で固定） |
| **ビルドツール** | Vite | vite-plugin-singlefile で単一HTML化 |
| **テストランナー** | Vitest | jsdom 環境、@vitest/coverage-v8 でカバレッジ計測 |
| **DOM統合テスト** | @testing-library/dom | 可読性高いクエリAPI |
| **リッチエディタ** | Quill 2.x | ツールバー装飾系のみに限定（画像埋め込みなし） |
| **XSS対策** | DOMPurify | allowlist方式でサニタイズ |
| **Lint** | ESLint(flat config) + eslint-plugin-no-unsanitized | innerHTML等の未サニタイズ代入を検出 |
| **Format** | Prettier | ESLintと共存するよう eslint-config-prettier を使用 |
| **パッケージマネージャ** | npm | package-lock.json で固定 |
| **CI/CD** | GitHub Actions | Lint / Test / Build は全push/PRで実行、main マージ時のみ Pages デプロイ |

**TypeScript を採用しない理由**：要件は「HTML + JavaScript」であり、単純さ優先の方針と合致するため。型情報が欲しい箇所は JSDoc コメントで補います。

---

## 4. Commands（実行コマンド）

| コマンド | 用途 |
|---|---|
| `npm ci` | 依存関係インストール（CI用。lockファイルを厳密に反映） |
| `npm run dev` | 開発サーバー起動（HMR有効） |
| `npm run build` | ビルド実行、`dist/index.html` を生成 |
| `npm run preview` | `dist/index.html` をローカルプレビュー |
| `npm test` | Vitest 単発実行 |
| `npm run test:watch` | Vitest ウォッチモード |
| `npm run test:coverage` | カバレッジ計測実行（100%未満でCI失敗） |
| `npm run lint` | ESLint 実行（警告のみ） |
| `npm run lint:fix` | ESLint --fix（自動修正） |
| `npm run format` | Prettier 実行（チェックのみ） |
| `npm run format:fix` | Prettier --write（自動整形） |

---

## 5. Project Structure（プロジェクト構成）

本セクションで示す構成は、実装時に従うべき推奨構成です。今回のタスクでは `docs/spec.md` と `CLAUDE.md` 作成のみのため、これらのディレクトリを実際に作成する必要はありません。

```
todo-app2/
├── .github/workflows/
│   └── ci-cd.yml                    # GitHub Actions: Lint/Test/Build/Deploy ジョブ
├── docs/
│   ├── _prompt.txt                  # 元指示書
│   ├── spec.md                      # 本仕様書
│   ├── main.jpg                     # メイン画面ラフスケッチ
│   └── detail.jpg                   # 詳細画面ラフスケッチ
├── src/
│   ├── index.html                   # Vite 開発用テンプレート（ビルドで単一化される）
│   ├── main.js                      # エントリポイント：アプリ初期化、イベント配線
│   ├── constants.js                 # 定数（文字数上限、localStorage キーなど）
│   ├── styles/
│   │   └── main.css                 # ダークテーマ CSS（Quill テーマ上書き含む）
│   ├── models/
│   │   └── todo.js                  # ToDo オブジェクト生成・更新ヘルパー
│   ├── storage/
│   │   └── todoRepository.js        # localStorage 読み書き、防御的パース
│   ├── logic/
│   │   ├── sections.js              # 本日中/明日まで/それ以外/未設定 の分類ロジック
│   │   ├── sort.js                  # ソート比較関数（締切ベース/登録順）
│   │   └── validation.js            # タイトル/詳細の文字数・必須チェック
│   ├── date/
│   │   └── dateFormat.js            # UTC ⇔ JST 変換、曜日フォーマット、暦日計算
│   ├── sanitize/
│   │   └── sanitizeHtml.js          # DOMPurify ラッパー（allowlist定義）
│   ├── editor/
│   │   └── richEditorAdapter.js     # Quill ラッパー（テスト時のフェイク差し替え可能）
│   └── ui/
│       ├── mainView.js              # メイン画面：タブ制御、一覧描画
│       ├── detailView.js            # 詳細画面（dialog）：入力、保存、バリデーション
│       └── charCounter.js           # 文字数カウンター共通部品
├── tests/
│   ├── unit/
│   │   ├── logic/
│   │   │   ├── sections.test.js
│   │   │   ├── sort.test.js
│   │   │   └── validation.test.js
│   │   ├── date/
│   │   │   └── dateFormat.test.js
│   │   ├── storage/
│   │   │   └── todoRepository.test.js
│   │   ├── sanitize/
│   │   │   └── sanitizeHtml.test.js
│   │   └── models/
│   │       └── todo.test.js
│   ├── integration/
│   │   ├── mainView.test.js         # jsdom 上でタブ切替、完了、一括削除を検証
│   │   └── detailView.test.js       # jsdom 上で保存、キャンセル、文字数超過を検証
│   └── setup.js                     # jsdom 共通セットアップ（localStorage初期化など）
├── vite.config.js                   # Vite 設定（vite-plugin-singlefile含む）
├── vitest.config.js                 # Vitest 設定（またはvite.config.jsに統合、カバレッジ閾値100%）
├── eslint.config.js                 # ESLint flat config
├── .prettierrc                       # Prettier 設定
├── .nvmrc                           # Node.js バージョン固定（20.x）
├── .gitignore                       # dist/, node_modules/ など
├── package.json
├── package-lock.json
├── CLAUDE.md                        # 本プロジェクトの開発指針
└── README.md                        # （任意）開発者向けクイックスタート
```

---

## 6. Code Style（コーディング規約）

### 命名規則

- **変数・関数**：camelCase（例：`getTodoList`, `isCompleted`）
- **真偽値**：`is` / `has` 接頭辞（例：`isVisible`, `hasError`）
- **イベントハンドラ**：`handle` / `on` 接頭辞（例：`handleSave`, `onTabChange`）
- **定数**：UPPER_SNAKE_CASE（例：`MAX_TITLE_LENGTH = 100`）
- **クラス**：PascalCase（例：`TodoModel`）

### ロジックと UI の分離

- **純粋ロジック**（`src/logic/`, `src/date/`, `src/sanitize/`, `src/storage/`）
  - 外部状態に依存しない
  - テスト容易性が高い
  - 返り値のみで動作を定義
- **DOM操作**（`src/ui/`）
  - ロジック層を呼び出して計算を行い、結果をDOM に反映
  - UI固有の副作用を明示する命名（例：`renderMainView`, `updateListDisplay`）

### HTML/DOM 操作のセキュリティ

- **ルール**：`innerHTML` / `outerHTML` への文字列代入は **必ず `sanitizeHtml()` ラッパー経由** で行う
- **強制機構**：ESLint の `eslint-plugin-no-unsanitized` で機械的に検出・エラー化
- **実装例**：
  ```javascript
  // ❌ NG: 直接代入
  element.innerHTML = userInput;
  
  // ✅ OK: sanitizeHtml() 経由
  element.innerHTML = sanitizeHtml(userInput);
  ```

### コメント

- 日本語で記述（グローバルCLAUDE.mdのルールを継承）
- WHY（なぜか）を説明することに注力。WHAT（何をしているか）は良い命名で示す
- 1行コメントは `//` を使用、複数行の説明は必要に応じてJSDocを付与

### その他

- `var` は使用禁止。`const` 優先、再代入が必要な場合のみ `let`
- マジックナンバー（100文字, 2000文字など）は `src/constants.js` に集約

---

## 7. Testing Strategy（テスト戦略）

### TDD の徹底

実装は必ず以下のサイクルで進める：

1. **Red**：失敗するテストを1つ書く
2. **Green**：テストを通す最小限の実装を書く
3. **Refactor**：コードを整理し、`npm run lint` を通す

### カバレッジ 100% の目指し方

- **対象範囲**：`src/` 配下の自作コード（純粋関数・UI操作）のみ
- **除外対象**：`node_modules/`（Quill, DOMPurify等のベンダーライブラリ）
- **計測方法**：`npm run test:coverage` で statements/branches/functions/lines の4指標が 100% に達していることを確認
- **CIゲート**：GitHub Actions で `npm run test:coverage` が 100% 未満の場合はビルド失敗

### 日時ロジックの検証

JST 日付が変わる瞬間（UTC 14:59:59 ↔ 15:00:00）は複数の代表ケースを **必ず** テストする：

```javascript
// 例：JST 2026-07-24 の UTC 00:00
// = JST 2026-07-24 09:00 （JST = UTC + 9）

it('should classify July 24 JST as today when run on July 24 JST', () => {
  const now = new Date('2026-07-24T00:00:00Z'); // JST 09:00
  const sections = buildSections(todos, () => true, now);
  // 結果をassert
});
```

`vi.setSystemTime()` でテスト時の「現在時刻」を固定し、テスト後に `vi.useRealTimers()` で復元：

```javascript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('...', () => {
  vi.setSystemTime('2026-07-24T00:00:00Z');
  // テスト実行
});
```

### Quill の テスト方法

Quill はブラウザの `contenteditable` に依存しており、jsdom の完全互換性が限定的です。以下の方針を取る：

- **`richEditorAdapter.js`** を薄いインターフェース層として作成：
  ```javascript
  export function getEditorHTML() { return quill.root.innerHTML; }
  export function setEditorHTML(html) { quill.root.innerHTML = html; }
  export function getEditorText() { return quill.getText(); }
  export function onChange(callback) { quill.on('text-change', callback); }
  ```
- **ユニットテスト時**：上記インターフェースをフェイク実装に差し替え
- **実 Quill への統合テスト**：任意のスモークテスト（カバレッジ対象外）として手動実行可能にする

### localStorage のテスト

各テストの `beforeEach` で `localStorage.clear()` を実行し、テスト間で状態が混在しないようにする：

```javascript
beforeEach(() => {
  localStorage.clear();
});

it('should save todo to localStorage', () => {
  // テスト
});
```

---

## 8. Boundaries（スコープ境界・Non-Goals）

以下の機能は **実装範囲外** です：

- **複数デバイス間同期**：クライアントサイドのみ、同期なし
- **アカウント・認証**：単一ユーザー、パスワード/ログイン機能なし
- **カテゴリ / タグ / 優先度**：フラットなタスクリストのみ
- **繰り返しタスク**：1回限りの ToDo のみ
- **リマインダー / 通知**：ブラウザ通知の実装なし
- **ドラッグ&ドロップによる並べ替え**：ソートは締切ベースの自動ソートのみ
- **インポート / エクスポート**：バックアップ/復元機能なし
- **URLルーティング / ディープリンク**：詳細画面の URL パラメータ化なし
- **PWA化（Service Worker）**：単一 HTML ファイルでのオフライン配布で十分

---

## 9. Success Criteria（成功基準）

以下のすべての条件を満たしたとき、アプリは実装完了と見なされます。

### 機能要件

- [ ] メイン画面の表示（タイトル、新規ボタン、3タブ、完了済削除ボタン、リスト）が正確に実装されている
- [ ] 詳細画面（dialog モーダル）の新規/編集機能が動作している
- [ ] タイトル欄：100文字制限、カウンター、必須チェック
- [ ] 日時欄：なし/日のみ/時分まで の3択が正確に機能している
- [ ] 詳細欄：Quill リッチエディタで装飾が可能、2000文字制限、カウンター
- [ ] 保存時に入力値が localStorage に UTC で保存される
- [ ] 画面表示時に localStorage から読み込まれ、UTC → JST に変換されて表示される
- [ ] 曜日が正確に表示される（例：`2026-07-24 (火)`）

### UI / UX 要件

- [ ] ダークテーマが全画面に統一して適用されている
- [ ] ライトテーマの フラッシュが発生しない
- [ ] 3タブの切り替えが即座に反映される
- [ ] セクション分け（本日中/明日まで/それ以外）が正確に機能している
- [ ] 完了項目は取り消し線＋減光表示される
- [ ] 完了 ↔ 未完了のボタンがトグルして機能し、クリックで即座に状態が切り替わる
- [ ] 「完了済を削除」クリック時に確認ダイアログが表示される

### オフライン / 永続化

- [ ] `dist/index.html` を単独で（`file://` または GitHub Pages 経由で）開いて動作する
- [ ] ネットワーク接続がない状態でも全機能が動作する
- [ ] ページをリロードした後、localStorage からデータが復元される
- [ ] 複数のタスクを登録・完了し、ブラウザを再起動してもデータが失われない

### セキュリティ

- [ ] 悪意あるHTML（例：`<img src=x onerror=alert(1)>`）を詳細欄に入力して保存→再読込してもスクリプトが実行されない
- [ ] DOMPurify による サニタイズが保存時・表示時の両方で機能している

### テスト / ビルド

- [ ] `npm run test:coverage` が `src/` 自作コード対象で **100%**（statements/branches/functions/lines）を達成している
- [ ] `npm run lint` でエラーが0件
- [ ] `npm run build` で `dist/index.html` が生成される
- [ ] 生成された `dist/index.html` は単一ファイル（CSS/JS インライン化済み）
- [ ] 生成されたHTMLをブラウザで開いて動作確認できる

### CI / CD

- [ ] GitHub Actions の ci-cd.yml が PR/push 時に Lint + Test + Build を実行して成功する
- [ ] `main` ブランチへのマージ時に GitHub Pages へ自動デプロイされる
- [ ] Pages 上の公開 URL でアプリが実際に動作する

---

## 10. Open Questions / 前提条件

### ユーザー確認済みの決定事項

以下4点は開発者（ユーザー）が事前確認済みの決定事項です。実装はこれらに準じます。

| # | 項目 | 決定 |
|---|---|---|
| 1 | リッチエディタの実装方式 | 外部ライブラリ（Quill）を1ファイルにバンドルする |
| 2 | 「単一HTMLファイル」と「TDD・カバレッジ100%」の両立 | src配下をモジュール分割し、ビルドで最終的に単一化する。「単一HTML」は成果物要件 |
| 3 | GitHub Actions の CI/CD 範囲 | テスト・Lint実行に加え、mainブランチマージ時に GitHub Pages へ自動デプロイ |
| 4 | 詳細画面の削除ボタン | 個別削除ボタンは配置しない（保存・キャンセルのみ）。削除はメイン画面の「完了済を削除」のみ |

### デフォルト採用している論点

以下の項目は、妥当なデフォルトを仮定して採用しています。実装中に異なる判断が必要であれば、その時点で質問してください。異論があれば此処で指摘してください。

| # | 論点 | デフォルト採用内容 | 根拠 |
|---|---|---|---|
| 1 | 「(壁)」「ちすること」の解釈 | 「(火)」＝曜日表示、「とすること」の誤字。日付表記に曜日を含める（`2026-07-24 (火)` 形式） | 元指示の文脈と画像（手書き）の整合性 |
| 2 | 本日中/明日まで/それ以外の判定基準 | 日本時間（JST）の暦日で判定 | アプリが日本ユーザー向けという前提 |
| 3 | 3タブ共通でセクション分けを適用するか | はい。完了済タブも締切ベースで分類し、行は取り消し線で視覚区別 | 実装単純化、UX一貫性 |
| 4 | 日時未設定 ToDo の配置 | 「それ以外」セクションの末尾に含める（独立見出しは作らない）、登録が古い順 | 元指示「一番後ろで登録が古いもの順」に準拠 |
| 5 | タイトルの必須/空文字 | 必須。trim後0文字では保存不可 | 空のタスクは不要と判断 |
| 6 | 詳細の必須/空文字 | 任意。空文字を許容 | リッチエディタ内容は補足情報、なくても成立 |
| 7 | 完了済み一括削除時の確認ダイアログ | 表示する | 不可逆操作のための安全策 |
| 8 | リッチエディタ出力（HTML）の XSS 対策 | DOMPurify で保存時・表示時の双方をサニタイズ（allowlist方式） | セキュリティ要件を最優先 |
| 9 | 「日だけ指定」時の内部締切時刻 | JST 23:59 とみなしてUTC変換。セクション判定・ソートのみに使用、表示は日付のみ | セクション判定の正確性とUI単純性を両立 |
| 10 | バンドラー/テストランナー | Vite + vite-plugin-singlefile / Vitest（jsdom）+ @vitest/coverage-v8 | 設定最小化、単純性優先、エコシステム統一 |
| 11 | Node.js/パッケージマネージャ | Node.js 20.x LTS以上 / npm | LTS安定性、標準パッケージマネージャ |
| 12 | 100%カバレッジの対象範囲 | `src/` 自作コードのみ（node_modules は除外） | ベンダーコードの品質を前提、自作コードで100%達成 |
| 13 | 完了済み行の視覚表現 | 取り消し線＋減光表示（ダークテーマ内） | 完了状態を直感的に表現 |
| 14 | ビルド成果物（dist/）のコミット | しない。`.gitignore` 対象、CIで都度ビルド | 履歴クリーン性、CI一元管理 |
| 15 | タブ表記 | 「完了済」に統一（「完了済み」ではなく）。ラフ画像に合わせ | UI統一性 |
| 16 | 詳細画面ポップアップの実装 | ネイティブ `<dialog>` 要素を使用 | モダンブラウザ標準、シンプル実装 |
| 17 | 詳細画面の URL への反映 | 行わない。単純なモーダル開閉のみ | 複雑性回避、単純さ優先 |
| 18 | 詳細欄の文字数カウント方式 | プレーンテキスト換算（装飾タグは数えない）。`quill.getText().length` ベース | ユーザーが実際に入力する文字数を正確に計測 |
| 19 | TypeScript の採用 | 不採用。「HTML + JavaScript」要件と単純さ優先に合わせ、型が必要な箇所は JSDoc で補う | 要件合致、セットアップ簡略化 |
| 20 | 外部ネットワーク通信 | 実装しない | 完全クライアントサイド動作維持 |
| 21 | localStorage キー設計 | `todoapp.todos.v1`（末尾にスキーマバージョン埋め込み） | 将来の マイグレーション対応 |

---

## リスト表示ロジック詳細（実装時の参考）

### JST 暦日抽出・日数差計算（擬似コード）

```javascript
// UTC Date オブジェクトを JST 暦日 "YYYY-MM-DD" に変換
// en-CA ロケールは ISO 順（YYYY-MM-DD）で返すため加工が不要
function toJSTCalendarDate(utcDate) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}

// "YYYY-MM-DD" 文字列同士の日数差を計算
// DST等の影響を避けるため、両日とも UTC 正午に固定して比較
function daysBetween(fromDateStr, toDateStr) {
  const parseDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Date.UTC(y, m - 1, d, 12, 0, 0); // UTC 正午
  };
  const diff = parseDate(toDateStr) - parseDate(fromDateStr);
  return Math.round(diff / 86400000); // ミリ秒→日に変換
}

// 例: daysBetween("2026-07-24", "2026-07-24") → 0
// 例: daysBetween("2026-07-24", "2026-07-25") → 1
// 例: daysBetween("2026-07-24", "2026-07-23") → -1 (期限超過)
```

### セクション分類ロジック

```javascript
// ToDo オブジェクトがどのセクションに属するかを判定
function classifySection(todo, todayJSTStr) {
  if (todo.dueAt === null) {
    return 'OTHER_UNSET'; // 締切未設定
  }
  
  const dueDate = new Date(todo.dueAt);
  const dueDateJSTStr = toJSTCalendarDate(dueDate);
  const diffDays = daysBetween(todayJSTStr, dueDateJSTStr);
  
  if (diffDays === 0) return 'TODAY';      // 本日中
  if (diffDays === 1) return 'TOMORROW';   // 明日まで
  return 'OTHER';                          // それ以外（超過含む）
}
```

### ソート関数

```javascript
// 複数の ToDo を、セクション内でのソート順に並べ替える
function compareTodos(a, b) {
  const aHasDue = a.dueAt !== null;
  const bHasDue = b.dueAt !== null;
  
  // 両方とも締切あり → 締切時刻（UTC）で昇順
  if (aHasDue && bHasDue) {
    return Date.parse(a.dueAt) - Date.parse(b.dueAt);
  }
  
  // 片方だけ締切あり → 締切ありが前
  if (aHasDue !== bHasDue) {
    return aHasDue ? -1 : 1;
  }
  
  // 両方とも締切なし → 作成日時（UTC）で昇順
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}
```

### セクション構築（3タブ共通で使用）

```javascript
function buildSections(allTodos, filterPredicate, now = new Date()) {
  const todayJSTStr = toJSTCalendarDate(now);
  
  // フィルタ条件を適用（「すべて」「未完了」「完了済」）
  const filtered = allTodos.filter(filterPredicate);
  
  // セクション別に分類
  const buckets = {
    TODAY: [],
    TOMORROW: [],
    OTHER: [],
    OTHER_UNSET: []
  };
  
  for (const todo of filtered) {
    const section = classifySection(todo, todayJSTStr);
    buckets[section].push(todo);
  }
  
  // 各セクション内でソート
  Object.values(buckets).forEach(items => items.sort(compareTodos));
  
  // 「それ以外」セクションには OTHER と OTHER_UNSET を連結
  // （OTHER_UNSET は末尾）
  const otherCombined = [...buckets.OTHER, ...buckets.OTHER_UNSET];
  
  // 表示用セクション配列を構築（空セクションは含めない）
  const sections = [];
  if (buckets.TODAY.length) {
    sections.push({ label: '本日中', items: buckets.TODAY });
  }
  if (buckets.TOMORROW.length) {
    sections.push({ label: '明日まで', items: buckets.TOMORROW });
  }
  if (otherCombined.length) {
    sections.push({ label: 'それ以外', items: otherCombined });
  }
  
  return sections;
}

// 各タブのフィルタ条件例
const filterByTab = {
  ALL: () => true,
  UNCOMPLETED: (todo) => !todo.completed,
  COMPLETED: (todo) => todo.completed,
};

// 使用例
const sections = buildSections(
  allTodos,
  filterByTab.UNCOMPLETED, // タブに応じてフィルタ条件を切り替え
  new Date() // 「現在」（テスト時は固定可能）
);
```

---

本仕様書は、ToDo アプリ実装の一次情報源です。疑問点やデフォルト値が異なる場合は、実装前に必ず指摘・修正してください。
