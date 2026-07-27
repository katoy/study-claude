# セキュリティレビュー結果レポート (todo-app2)

サブエージェント `security_reviewer` によるセキュリティレビューが完了しました。ソースコード、設定ファイル、依存関係の網羅的な検査結果を以下に報告します。

---

## 脆弱性および改善指摘項目

### 1. 依存関係の脆弱性 (DOMPurify の古いバージョン)
* **重要度 (Severity):** **High**
* **対象ファイル:** [package.json](file:///Users/katoy/github/study-claude/todo-app2/package.json#L27)
* **脆弱性の概要:** 
  プロジェクトで使用されている `dompurify` のバージョン定義が `"dompurify": "^3.0.9"` となっています。DOMPurify の 3.0.x 系には、XSSバイパスやテンプレートインジェクションの既知の脆弱性（CVE-2024系、CVE-2025系など）が報告されています。
* **影響範囲:** 
  アプリ全体。リッチテキストエディタ（Quill）からの入力データをサニタイズする際に、細工された悪意のあるHTMLによるXSS（クロスサイトスクリプティング）を完全に防御できないリスクがあります。
* **推奨対策 (修正案):**
  `package.json` のバージョンを、最新の安定したセキュリティ対策済みバージョン（例: `^3.1.6` 以降、または最新 of `3.x`）へアップデートしてください。

```diff
  "dependencies": {
-   "dompurify": "^3.0.9",
+   "dompurify": "^3.1.6",
    "quill": "^2.0.3"
  }
```

---

### 2. 不適切な Content Security Policy (CSP) 設定
* **重要度 (Severity):** **Medium**
* **対象ファイル:** [src/index.html](file:///Users/katoy/github/study-claude/todo-app2/src/index.html#L8)
* **脆弱性の概要:**
  CSPの定義において、`script-src` および `style-src` に `'unsafe-inline'` が指定されています。
* **影響範囲:**
  万が一、他の要因（例: DOMPurify のバイパスなど）によりアプリケーション内にXSS脆弱性が発生した場合、ブラウザがインラインスクリプトの実行を阻止できず、セッションハイジャック等の被害が拡大する可能性があります。
* **推奨対策 (修正案):**
  Vite プラグイン `vite-plugin-singlefile` を使用したビルドを行っているためインライン記述が混入していますが、本番環境の要件が許すならば、アセットを外部ファイルとして出力させ、`'unsafe-inline'` をポリシーから削除することが望ましいです。
  シングルファイル化が必須な場合は、ビルド時にnonceを注入する機構を検討するか、CSPを可能な限り厳格化してください。

```diff
-   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" />
+   <!-- シングルファイルを維持しない場合の厳格なCSP -->
+   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;" />
```

---

### 3. 潜在的なDoS・エラーハンドリングの不備（バリデーション設計）
* **重要度 (Severity):** **Low**
* **対象ファイル:** [src/models/todo.js](file:///Users/katoy/github/study-claude/todo-app2/src/models/todo.js#L76-L81), [src/date/dateFormat.js](file:///Users/katoy/github/study-claude/todo-app2/src/date/dateFormat.js#L7-L22)
* **脆弱性の概要と影響:**
  1. **HTMLタグを含む詳細文の長さ制限不足**:
     `todo.js` の `isValidTodo` 内で `detailHtml` の長さを `MAX_DETAIL_LENGTH` (2000文字) でバリデーションしています。しかし、Quillエディタで書式設定されたテキストは、内部で大量のHTMLタグ（`<p>`, `<strong>`等）に変換されるため、ユーザーが入力した純粋な文字数が2000文字未満であっても、バリデーションエラーになり保存に失敗するおそれがあります。
  2. **日付変換時のクラッシュリスク**:
     `dateFormat.js` の `convertToUtcForDate` および `convertToUtcForDateTime` にて、不正な日付フォーマットが渡された場合、`new Date()` が `Invalid Date` を返し、その後の `.toISOString()` の呼び出しで `RangeError: Invalid time value` が発生してアプリ全体がクラッシュ（DoS状態）します。
* **推奨対策 (修正案):**
  * `src/models/todo.js` における `detailHtml` のバリデーション制限を大幅に緩和（文字制限をタグ考慮して5〜10倍に設定する、もしくは詳細テキストのプレーンテキスト表現 `detail` のみを文字数チェックする）する。
  * `src/date/dateFormat.js` の変換処理で日付文字列のパース検証を追加し、エラーをハンドリングする。

#### `todo.js` 修正案:
```diff
  // HTMLタグを含むため、許容長を増やす、またはプレーンテキスト(detail)のみで判定する
  if (
    todo.detailHtml !== undefined &&
-   (typeof todo.detailHtml !== 'string' || todo.detailHtml.length > MAX_DETAIL_LENGTH)
+   (typeof todo.detailHtml !== 'string' || todo.detailHtml.length > MAX_DETAIL_LENGTH * 5)
  ) {
    return false;
  }
```

#### `dateFormat.js` 修正案:
```diff
  export function convertToUtcForDate(jstDateStr) {
    const date = new Date(`${jstDateStr}T23:59:59.000+09:00`);
+   if (Number.isNaN(date.getTime())) {
+     throw new Error('Invalid date format');
+   }
    return date.toISOString();
  }
```

---

## 総括
パスワードやAPIキーなどの機密情報（Secrets）のソースコード内へのハードコードは検出されませんでした。
最も緊急度の高い対策は **DOMPurify の最新版への更新** です。これらの修正を自動で適用する作業を開始しますか？
