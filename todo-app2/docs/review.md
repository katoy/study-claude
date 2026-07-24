# レビュー報告書：docs/spec.md および CLAUDE.md

本ドキュメントは、ToDoアプリ開発プロジェクトにおける基本仕様書（[docs/spec.md](file:///Users/katoy/github/study-claude/todo-app2/docs/spec.md)）と開発指針（[CLAUDE.md](file:///Users/katoy/github/study-claude/todo-app2/CLAUDE.md)）をレビューした結果をまとめたものです。

---

## 1. 総評 (Executive Summary)

全体として、`docs/spec.md`（一次情報源）と `CLAUDE.md`（開発指針）は極めて高い整合性を持って作成されています。技術スタック、ディレクトリ構造、コマンド一覧、コーディング規約、テスト戦略（カバレッジ100%ルールやQuillのモック化など）が相互に矛盾なく定義されており、このまま開発を進めるにあたって強固な土台となっています。

一方で、実際にコードを記述する段階で発生し得る **エッジケース（ライブラリ特有の挙動や、境界値の定義）** について、一部明確化や注意喚起をしておくことで、よりスムーズな開発（テストファーストでの手戻り防止）が期待できる点が見つかりました。

---

## 2. 整合性チェック結果 (Consistency Check)

以下の主要領域において、2つのドキュメント間で不整合がないことを確認しました。

*   **技術スタック**:
    *   言語（TypeScript不採用のVanilla JS）、Viteによる単一HTML化、Vitest + @vitest/coverage-v8 によるテスト、Quill 2.x、DOMPurify、ESLint flat config、Prettier、GitHub Actions CI/CD設定など、すべての項目が完全に一致しています。
*   **ディレクトリ構成**:
    *   `src/` 配下の構造および `tests/` 配下のユニット/統合テストの配置ルールが両ドキュメントで共通して定義されています。
*   **コーディング・セキュリティ規約**:
    *   `innerHTML` への文字列代入時に必ず `sanitizeHtml()` を通す点、`eslint-plugin-no-unsanitized` による強制化、マジックナンバーの `src/constants.js` への集約ルールなどが共通しています。
*   **TDDおよびテスト方針**:
    *   カバレッジ100%の強制、日時ロジックのJST境界値テスト（後述）、Quillのアダプターによるテスト用モック化方針などが完全に整合しています。

---

## 3. 懸念点・あいまいな点と改善提案 (Concerns & Suggestions)

実装時にバグやテストの失敗を引き起こしやすい以下の5点について、詳細な補足や改善提案を行います。

### 3.1 Quill の文字数カウントにおける末尾改行（`\n`）の挙動
*   **現状の記載**:
    *   `spec.md` (L119, L700): Quillのリッチエディタで詳細欄は最大2000文字（プレーンテキスト換算）。カウンターは `quill.getText().length` ベース。
*   **懸念点**:
    *   Quillは内部仕様として、エディタが空（何も入力されていない状態）であっても、`quill.getText()` は常に末尾に改行文字 `\n` を1文字付加した文字列（`"\n"`、長さ1）を返します。そのため、単純に `quill.getText().length` を使うと、空の時に「1文字」とカウントされ、文字数制限チェックや文字数カウンターにズレが生じます。
*   **改善提案**:
    *   文字数カウントおよび文字数チェック時には、以下のように末尾の改行を1つ取り除くか、空文字判定を最初行うように実装を統一することを推奨します。
        ```javascript
        // 末尾の1つの改行文字を除外してプレーンテキストの長さを取得する
        const text = quill.getText();
        const length = text.endsWith('\n') ? text.length - 1 : text.length;
        ```

### 3.2 曜日表示のフォーマット（括弧の処理）
*   **現状の記載**:
    *   `spec.md` (L165, L316): `2026-07-24 (火)` のように日付表記に曜日を含める。
    *   `spec.md` (L339): 曜日を単漢字で取得するヘルパー例として `toJSTWeekday(utcDate)` が定義されている。
*   **懸念点**:
    *   `toJSTWeekday` が `"火"` を返す場合、画面表示時の `(火)` という丸括弧をどこで付与するかが明記されていません。
*   **改善提案**:
    *   日付フォーマット関数（例: `formatDueDate`）の実装側で `(${toJSTWeekday(date)})` のように括弧を補うルールであることをドキュメントまたは実装時の設計に明記しておくと、UIのブレを防げます。

### 3.3 `isValidTodo` バリデータ関数の定義
*   **現状の記載**:
    *   `CLAUDE.md` (L360): localStorageのパース時に `data.filter(isValidTodo)` を通して不正なエントリをフィルタリングする。
*   **懸念点**:
    *   この `isValidTodo` の具体的なバリデーション基準が定義されていません。
*   **改善提案**:
    *   `src/logic/validation.js` もしくは `src/models/todo.js` にて、`isValidTodo` の検証項目を以下のように定義すると防御的パースが確実になります。
        *   オブジェクトであり、かつ `null` でないこと
        *   `id` (string), `title` (string), `dueType` ('none'|'date'|'datetime'), `completed` (boolean), `createdAt` (string), `updatedAt` (string) の各キーが存在し、型が正しいこと
        *   `dueAt` が `null` または文字列であること
        *   `detailHtml` が文字列であること

### 3.4 「日のみ」指定時の内部締切時刻（JST 23:59:59）とタイムゾーン境界
*   **現状の記載**:
    *   `spec.md` (L360): 「日のみ」で `2026-07-25` が選択された場合、内部的には **その日の JST 23:59:59** を UTC 変換して保存する。
*   **懸念点**:
    *   JSTの `2026-07-25 23:59:59` は、UTCでは `2026-07-25 14:59:59Z` となります。
    *   セクション判定（「本日中」「明日まで」「それ以外」）を行う際、「本日」や「明日」の基準は **実行時点の日本時間（JST）の今日（暦日）** から数えた日数差（0日 = 本日中, 1日 = 明日まで）で計算されます。
    *   JSTの「本日（23:59:59）」をUTCに変換してソート・比較するとき、現在時刻 `now`（JST）の暦日との日付差の計算ロジック（`daysBetween`）において、タイムゾーンの処理（UTC正午に固定して比較する工夫など）が厳密に行われないと、深夜の時間帯に「明日まで」のものが「本日中」と誤判定されるなどのズレが生じる可能性があります。
*   **改善提案**:
    *   `spec.md` L723「両日とも UTC 正午に固定して比較」というアプローチはDSTや微小な時差のズレを吸収する上で非常に有効です。この処理が `dueType === 'date'`（時分を含まない）と `dueType === 'datetime'`（時分を含む）の双方で正しく機能するように、`daysBetween` に渡す日付文字列（`YYYY-MM-DD`）を **JSTタイムゾーン基準で暦日抽出した文字列** に揃えてから比較することを徹底してください。

### 3.5 Quill のスタイル（CSS）バンドルとインライン化
*   **現状の記載**:
    *   `spec.md` (L374, L672): `vite-plugin-singlefile` で単一HTML化し、QuillのCSS等もインライン化する。
*   **懸念点**:
    *   Quillは通常、`dist/` 出力時に別ファイルのCSS（例: `quill.snow.css`）を読み込む必要があります。`vite-plugin-singlefile` は `main.js` や `main.css` をHTMLにインライン化してくれますが、`node_modules/` 内のCSSをどのようにインポートしてビルドするかが曖昧だと、ビルド成果物のHTMLでリッチエディタのスタイルが崩れる（テーマが適用されない）問題が発生します。
*   **改善提案**:
    *   `src/styles/main.css` の冒頭で `@import "quill/dist/quill.snow.css";` のように明示的にインポートするか、`src/main.js` のヘッダー部で `import 'quill/dist/quill.snow.css';` を実行し、ViteがCSSツリーを解析して最終的なHTMLの `<style>` タグ内に自動的にインライン化されるよう構成することを推奨します。

---

## 4. 結論と次のステップ (Conclusion & Next Steps)

本レビューで挙げた懸念点は、いずれも実装時のコードの書き方やViteの設定によって十分に回避可能なレベルのものです。仕様書（`spec.md`）自体を修正する必要性は極めて低く、本レビューで整理した注意点（特に Quill の `\n` カウントバグの回避や CSS のインポート方法）を開発チーム/開発アシスタントが頭に入れた上で、以下のステップに進むことを推奨します。

1.  **プロジェクト初期化**:
    *   `package.json`, `.nvmrc`, `eslint.config.js`, `.prettierrc`, `vite.config.js` などの環境設定ファイルの作成。
2.  **TDDサイクル開始**:
    *   `src/logic/validation.js` の `isValidTodo` や、`src/date/dateFormat.js` の JST/UTC 変換関数から、テストを先行して記述し実装する。
