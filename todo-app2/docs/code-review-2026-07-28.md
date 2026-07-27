# コード・設定レビュー報告書（2026-07-28）

対象：`todo-app2` の実装コード（`src/`）、テスト（`tests/`）、ビルド／CI 設定一式
基準：`docs/spec.md`（一次情報源）、`CLAUDE.md`（開発指針）
※ 既存の `docs/review.md` は実装前の「仕様書レビュー」です。本書はその後に書かれた**実装と設定**のレビューであり、別文書として併存させています。

---

## 0. 実測した検証結果

レビューにあたり、以下をローカルで実際に実行して確認しました。

| 検証 | コマンド | 結果 |
|---|---|---|
| ESLint | `npm run lint` | エラー 0 件 |
| Prettier | `npm run format` | 全ファイル準拠 |
| Biome | `npm run biome:check` | 35 ファイル、指摘 0 件 |
| テスト | `npm run test:coverage` | 10 ファイル / 90 テスト すべて成功 |
| カバレッジ | 同上 | Statements 380/380、Branches 182/182、Functions 53/53、Lines 370/370（**計測対象は 11 ファイル**、後述 R-1） |
| ビルド | `npm run build` | `dist/index.html` 269KB（gzip 78KB） |

**総評**：層分離・防御的パース・二重サニタイズといった設計方針は、指針どおりに一貫して実装されています。純粋ロジック層（`logic/` `date/` `models/` `storage/` `sanitize/`）の品質は高く、そのまま維持してよい水準です。
一方で、**仕様に明記された「外部ネットワーク依存なし」が実装で破られている**点（C-1）と、**品質ゲートの実態がドキュメントの記述と食い違っている**点（R-2 / R-3 / R-4）は、いずれも「守れているつもりで守れていない」種類の問題であり、優先的な対応を推奨します。

---

## 1. Critical（マージ前に対応が必要）

### C-1. 外部ネットワーク（Google Fonts）への依存が実装に残っている

**該当**：`src/index.html:8-10`

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:...&family=Inter:..." rel="stylesheet" />
```

**問題**：以下の 3 つの明文化されたルールに同時に違反しています。

- `docs/spec.md:21`「オフラインで完全に動作する（外部ネットワークリソースへの依存なし）」
- `docs/spec.md:700`（Open Questions 決定表 #20）「外部ネットワーク通信：実装しない」
- `CLAUDE.md` Never 節「外部サーバーへの通信を追加しない（完全クライアントサイド維持）」

**確認済みの影響**：ビルド後の `dist/index.html` にもこの 3 行がそのまま残存していることを確認しました（`grep` で 8〜10 行目に検出）。したがって「単一ファイル・オフライン動作」という成果物の前提が実際に成立していません。

- オフライン時は `Outfit` / `Inter` が読み込まれず、フォールバック（`-apple-system` 等）に落ちて表示が変わる
- 起動のたびに Google のサーバーへ IP アドレスと User-Agent が送信される
- `docs/spec.md:637`「ネットワーク接続がない状態でも全機能が動作する」という受け入れ条件を満たしていない

**対応案**（いずれか）

1. woff2 を `src/assets/` に同梱し `@font-face` で参照する（Vite が base64 でインライン化するため単一ファイル性は保てます）
2. Web フォントをやめ、`--font-family` をシステムフォントスタックのみにする

**注意**：どちらを選んでも描画が変わるため、`npm run test:vrt:update` による VRT 基準画像の再生成（darwin / linux 両方）が必要です。

---

## 2. 要対応（Required）

### R-1. カバレッジ計測から `src/main.js` が除外されており、153 行が完全に未テスト

**該当**：`vitest.config.js:20`

```js
exclude: ['src/main.js', 'src/editor/richEditorAdapter.js'],
```

**問題**：`richEditorAdapter.js` の除外は `CLAUDE.md`（Quill は jsdom と互換性が限定的、アダプタはフェイクに差し替える方針）に根拠があり妥当です。しかし **`src/main.js` の除外には、`CLAUDE.md` にも `docs/spec.md` にも根拠の記載がありません。**

`main.js` は単なる配線ではなく、以下の実ロジックを含みます。

- `createOrUpdateTodoFromFormData()`（`main.js:51-60`）— 新規作成と編集の分岐、存在しない ID のときに `null` を返す分岐
- `onToggleComplete` / `onDeleteCompleted` / `onSave` の状態遷移（`main.js:65-106`）
- 必須 DOM 要素が見つからない場合の早期 return（`main.js:135-138`）

`coverage-final.json` を確認したところ、実際の計測対象は 11 ファイルのみで、`main.js`（153 行）と `richEditorAdapter.js`（58 行）は計測すらされていません。つまり「カバレッジ 100%」は**自作コード全体ではなく、11 ファイルに対する 100%** です。

これは `CLAUDE.md`「対象：`src/` 配下の自作コード」および Never 節「テストを削除/skip してカバレッジ 100% を達成しない」の趣旨に反します。

**対応案**：`main.js` の純粋部分（`createOrUpdateTodoFromFormData` など）を `src/logic/` へ切り出してテスト対象にするか、jsdom 上で `init()` を呼ぶ統合テストを追加して exclude から外す。除外を維持する判断であれば、その理由を `CLAUDE.md` に明記してください（`CLAUDE.md` の Ask first 節「カバレッジ 100% 目標を一時的に除外/緩和したいとき」に該当します）。

### R-2. README の CI バッジが存在しないワークフローを指しており、常に無効

**該当**：`README.md:7`、`CLAUDE.md:310,318`

```markdown
[![ToDo App 2 CI](https://github.com/katoy/study-claude/actions/workflows/todo-app2-ci.yml/badge.svg)](...)
```

**問題**：リポジトリルートの `.github/workflows/` に存在するのは `all-projects-ci.yml` **1 ファイルのみ**です。`todo-app2-ci.yml` も `pages-deploy.yml` も存在しません（`todo-app2-ci` は `all-projects-ci.yml:197` の **job 名**）。

- README のバッジは対象ワークフローが解決できず、常に "no status" 表示になります
- `CLAUDE.md:310` の「`.github/workflows/todo-app2-ci.yml` および `pages-deploy.yml`」、`CLAUDE.md:318` の「`pages-deploy.yml` が走り」も同様に実態と不一致です

**対応案**：バッジ URL を `all-projects-ci.yml` に修正し、`CLAUDE.md` の該当記述を「`all-projects-ci.yml` の `todo-app2-ci` job / `deploy` job」に書き換える。

### R-3. pre-push フックの実体が別プロジェクト配下にあり、ローカル設定でしか有効にならない

**該当**：`CLAUDE.md` Always 節、`README.md:135-139`

ドキュメントは「リポジトリの `.husky/pre-push` フックにより自動実行される」と記載していますが、実際には：

- リポジトリルートに `.husky/` は**存在しません**
- フック本体は `contact-form/myproject/.husky/pre-push` にあります（コミット `7853a9d` で追加）
- 有効化しているのは `core.hooksPath = contact-form/myproject/.husky/_` という **ローカル git config** です

**問題**：`core.hooksPath` は `.git/config` に保存されるためコミットされません。**リポジトリを clone し直した環境、および他の開発者・他のマシンではフックは一切動作しません。** また `todo-app2` の品質ゲートが無関係な `contact-form/myproject/` 配下に置かれている構成は、どちらのプロジェクトを触る人にとっても発見しづらい状態です。

**対応案**：フックをリポジトリルートの `.husky/` へ移し、`package.json` の `prepare` スクリプト（`husky`）で `core.hooksPath` を自動設定する。移設が難しい場合は、少なくとも `CLAUDE.md` / `README.md` に実際のパスと「`core.hooksPath` の手動設定が必要」である旨を明記してください。

### R-4. VRT がビルドを伴わないため、単体実行時に古い `dist/` を検証しうる

**該当**：`playwright.config.js:31-36`

```js
webServer: {
  command: 'npm run preview',   // dist/ を配信するだけでビルドはしない
  reuseExistingServer: !process.env.CI,
}
```

**問題**：`vite preview` は既存の `dist/` を配信するだけです。`ci:check` は `build → test:vrt` の順に実行されるため CI 経路は安全ですが、開発者が `npm run test:vrt` を単体で叩いた場合、**ソースを変更しても古い `dist/` に対して VRT がパスします**（＝偽陽性）。VRT の目的である「変更の視覚的影響の検知」が、最も使われがちな単体実行時に機能しません。

**対応案**：`"test:vrt": "npm run build && playwright test"` にする、または `webServer.command` を `npm run build && npm run preview` にする。

---

## 3. Consider（推奨、必須ではない）

### S-1. タブのアクティブ状態が二重管理されている

**該当**：`src/main.js:119-126` と `src/ui/mainView.js:21-30`

同一の `#tabs` 要素に、2 つのモジュールがそれぞれ click リスナーを登録しています。

- `mainView.js` 側：DOM から読んだタブで `renderMainView(currentTodos, tab)` を呼ぶ（描画を担当）
- `main.js` 側：`appState.activeTab` を更新するだけ（状態を担当、再描画はしない）

現状は「`initMainView` → `attachEventListeners` の登録順」により結果的に整合していますが、**単一の関心事が 2 つのモジュールに分割されており、片方を消すと壊れます**（`mainView` 側を消すと再描画されなくなり、`main.js` 側を消すと以降の `renderUI()` が古いタブで描画される）。

**対応案**：`activeTab` の所有者を `main.js` に一本化し、`mainView` 側は `callbacks.onTabChange(tab)` を呼ぶだけにする。`onEditRequest` / `onToggleComplete` / `onDeleteCompleted` と同じパターンに揃うため、設計の一貫性も上がります。

### S-2. `isValidTodo` が文字数上限をハードコードしている

**該当**：`src/models/todo.js:59,64`

```js
if (typeof todo.title !== 'string' || todo.title.trim() === '' || todo.title.length > 100) {
if (todo.detail !== undefined && (typeof todo.detail !== 'string' || todo.detail.length > 2000)) {
```

`CLAUDE.md`「マジックナンバー（100文字, 2000文字など）は `src/constants.js` に集約」に反します。`MAX_TITLE_LENGTH` / `MAX_DETAIL_LENGTH` を import してください。現状、上限を変更すると `validation.js` は追随しますが `todo.js` は取り残され、**保存はできるが再読み込み時に黙って破棄される** という追跡困難な不具合になり得ます。

### S-3. JST 変換ロジックが 3 箇所に重複

**該当**：`src/date/dateFormat.js:41`、`同:66`、`src/ui/detailView.js:23`、`同:37`

`new Date(d.getTime() + 9 * 60 * 60 * 1000)` からの `getUTCFullYear()` / `padStart` の組み立てが 4 箇所に散らばっています。`9 * 60 * 60 * 1000` 自体もマジックナンバーです。

**対応案**：`dateFormat.js` に `toJstParts(utcStr) → { yyyy, mm, dd, hh, mi, weekday }` を切り出し、`detailView.js` からも使う。UI 層が日時変換を自前で持っている点は「ロジック ↔ UI の分離」の観点でも解消したい箇所です。

### S-4. 完了行のスタイルが JS 内にインライン埋め込みされている

**該当**：`src/ui/mainView.js:112-114`

```js
const titleStyle = todo.completed ? 'style="text-decoration: line-through; color: gray;"' : '';
```

478 行の CSS でデザイントークン（`--text-secondary` 等）を整備しているにもかかわらず、ここだけ `gray` を直値で持っています。`.todo-title.is-completed` クラスを CSS 側に定義し、JS はクラス名の付け外しだけを行う形が、既存のスタイル方針と一貫します。

### S-5. 独自の HTML エスケープ実装

**該当**：`src/ui/mainView.js:119-124`

`replace` チェーンによる手書きエスケープの直後に、生成した HTML 全体を `sanitizeHtml()` に通しています。二重防御そのものは方針どおりですが、**エスケープ処理が UI 層に直書きされていて単体テストの対象になっていません**。

**対応案**：`document.createElement` + `textContent` による DOM 構築に切り替える（エスケープが原理的に不要になる）か、`escapeHtml()` を `src/sanitize/` へ切り出してテストを付ける。

### S-6. Prettier と Biome のフォーマッタ二重運用

`ci:check` は `prettier --check` と `biome check`（フォーマッタ有効）の両方を実行しています。現状は設定値が一致（シングルクォート／セミコロン／`trailingComma: es5`／幅 100）しているため衝突していませんが、**片方だけ更新した瞬間に恒久的に解決不能な差分が生まれます**。どちらかに寄せるか、Biome のフォーマッタを無効にして Linter 専用にすることを検討してください。

### S-7. VRT の差分許容量が緩い

**該当**：`playwright.config.js:8`

`maxDiffPixelRatio: 0.05` は 1280×720（921,600 px）に対し **最大 46,080 px の差分を許容**します。OS 間のアンチエイリアス差を吸収する意図は理解できますが、この幅だと文字色の変更や小さめの要素の消失といった中程度の回帰も検知できません。OS ごとに基準画像を分けている（darwin / linux）ので、`0.01` 程度まで絞る余地があります。

---

## 4. Nit（軽微）

| # | 該当 | 内容 |
|---|---|---|
| N-1 | `package.json` | `esbuild` が `dependencies` にある。ビルド時依存（かつ Vite の推移的依存）なので不要、少なくとも `devDependencies` へ |
| N-2 | `src/ui/detailView.js:193-209` | タイトルの keydown 制限は `maxlength="100"` と重複。加えて 100 文字ちょうどのとき `allowedKeys` に無い `Ctrl+C` / `Ctrl+V` / `Ctrl+A` / `Home` / `End` まで `preventDefault()` される。ハンドラごと削除するのが素直 |
| N-3 | `package.json` `format` | 対象が `src/**/*.js` と `tests/**/*.js` のみ。ルートの `*.config.js`、`src/index.html`、`src/styles/main.css` は Prettier 未チェック（Biome 側でカバー中） |
| N-4 | `package.json` / `.nvmrc` | `engines` フィールドなし。Vite 8 は Node `^20.19 \|\| >=22.12` を要求するが `.nvmrc` は `20` のみで minor 未固定 |
| N-5 | `src/index.html` | CSP の meta タグが無い。`CLAUDE.md` は「CSP は `script-src 'unsafe-inline'` を許容」と方針を書いているが未実装。`default-src 'self'` を入れれば C-1 の外部フォントも機械的に検出できる |
| N-6 | `contact-form/myproject/.husky/pre-push:41` | `git log HEAD -- todo-app2/ -n 1` は該当コミットが無くても終了コード 0 を返すため、upstream 未設定時のフォールバックが常に true になる。出力の有無で判定すべき（安全側に倒れるので実害は「毎回 ci:check が走る」だけ） |
| N-7 | `src/models/todo.js:67` | `detailHtml` に長さ上限が無い（`detail` は 2000 で検証）。localStorage を直接編集された場合、巨大文字列がそのまま Quill に流し込まれる |
| N-8 | `src/ui/detailView.js:248-251` | radio に `change` と `click` の両方を登録しており `updateDueTypeUI` が 1 操作で 2 回走る。`change` のみで十分 |
| N-9 | `src/main.js:70,114` | `data-editing-id` が保存後もキャンセル後もクリアされない。開く前に必ず設定／削除されるため現状は実害なしだが、`closeDetailModal()` でクリアする方が安全 |
| N-10 | `docs/main.jpg` (2.9MB) / `docs/detail.jpg` (3.0MB) | 追跡下にあり clone コストを約 6MB 増やしている。縮小 or Git LFS を検討 |
| N-11 | `src/ui/mainView.js:36` | 削除確認が `window.confirm`。`docs/spec.md:143` は「削除」「キャンセル」を選ばせると記載しており、ボタン文言が仕様と厳密には異なる |

---

## 5. 仕様（`docs/spec.md`）との突き合わせ結果

実装が仕様どおりであることを確認できた項目：

| 仕様 | 該当箇所 | 判定 |
|---|---|---|
| セクション分類（本日中／明日まで／それ以外、`spec.md:150-156`） | `src/logic/sections.js` | ✅ 期限超過・締切未設定がいずれも「それ以外」に入る点まで一致 |
| 空セクションの見出しを出さない | `sections.js:51-53` の `filter` | ✅ |
| ソート順（締切あり昇順 → 締切なし作成日時昇順、`spec.md:184-190`） | `src/logic/sort.js` | ✅ 「それ以外」内で 期限超過 → 将来 → 未設定（古い順）になる |
| 3 タブ共通でセクション分けを適用（決定 #3） | `mainView.js:84-100`（フィルタ後に `buildSections`） | ✅ |
| 「日だけ指定」を JST 23:59 として UTC 保存（決定 #9） | `dateFormat.js:7-11` | ✅ |
| JST 暦日での日数差判定（UTC 正午固定、`spec.md:723`） | `dateFormat.js:80-88` | ✅ 日跨ぎ境界のテストも `tests/unit/logic/sections.test.js` に存在 |
| 完了トグルの即時反映と自動保存 | `main.js:74-79` → `persistAndRender` | ✅ |
| 完了 0 件時に削除ボタンを disabled | `mainView.js:93-97` | ✅ |
| 二重サニタイズ（保存時・表示時） | `richEditorAdapter.js:28,38` / `mainView.js:139` | ✅ |
| localStorage の防御的パース | `todoRepository.js:20-55` + `isValidTodo`（UUID v4 正規表現含む） | ✅ |
| オフラインで完全動作（`spec.md:21,637`） | `src/index.html:8-10` | ❌ **C-1 参照** |

---

## 6. 評価できる点

- **層分離の徹底**：`logic/` `date/` `models/` `storage/` `sanitize/` は DOM にも localStorage にも依存せず、純粋関数として単体テストできる形になっています。これが 90 テスト／高カバレッジを低コストで達成できている理由です。
- **`eslint-plugin-no-unsanitized` による機械的強制**：`eslint-disable` は `richEditorAdapter.js:37` と `mainView.js:138` の 2 箇所のみで、いずれも直後に `sanitizeHtml()` を通しており、抑制の理由が読んで分かります。抜け道として濫用されていません。
- **防御的バリデータ**：`isValidTodo` が UUID v4 形式、`dueType` の列挙、`dueType === 'none'` と `dueAt === null` の整合、日付文字列のパース可否まで検証しています。localStorage を信頼しないという方針が実装で貫かれています。
- **JST 境界のテスト**：`vi.setSystemTime()` による UTC 14:59:59 ↔ 15:00:00 の境界検証が実装されており、指針が形骸化していません。
- **VRT の OS 別基準画像**：darwin / linux 双方の基準画像をコミットし、`page.clock.install()` で時刻を固定する運用は、この規模のプロジェクトとしては丁寧です。

---

## 7. 推奨する対応順序

1. **C-1**：Google Fonts の除去（仕様違反の解消）→ VRT 基準画像を darwin / linux 両方で再生成
2. **R-2**：README バッジ URL と `CLAUDE.md:310,318` のワークフロー名を実態に合わせる（数分で終わり、誤解の温床を潰せる）
3. **R-4**：`test:vrt` にビルドを含める（1 行の変更で偽陽性を排除）
4. **R-3**：pre-push フックをリポジトリルートへ移設、または実態をドキュメントに反映
5. **R-1**：`main.js` のテスト方針を決める（ロジック切り出し / 統合テスト追加 / 除外理由の明文化のいずれか）
6. **S-1 〜 S-7、N-1 〜 N-11**：通常のリファクタリングサイクルで順次

---

## 8. 判定

**Request changes** — C-1（仕様に明記された「外部ネットワーク依存なし」の違反）は、成果物の前提そのものに関わるため対応を推奨します。R-1 〜 R-4 は品質ゲートが「動いているつもりで動いていない／守れているつもりで守れていない」状態であり、放置すると後続の変更で気づかないまま品質が落ちます。

これらを除けば、実装そのものの設計・テスト・セキュリティ対策の水準は高く、指摘の大半は設定とドキュメントの整合性に関するものです。
