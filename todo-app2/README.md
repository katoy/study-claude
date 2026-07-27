# Premium ToDo App

洗練されたダークテーマデザインとリッチテキストエディタ（Quill）を融合させ、TDD（テスト駆動開発）によって堅牢に実装されたモダンなシングルファイル型 ToDo アプリケーションです。

🚀 **デプロイ先 (GitHub Pages):** [https://katoy.github.io/study-claude/todo-app2/](https://katoy.github.io/study-claude/todo-app2/)

[![ToDo App 2 CI](https://github.com/katoy/study-claude/actions/workflows/todo-app2-ci.yml/badge.svg)](https://github.com/katoy/study-claude/actions/workflows/todo-app2-ci.yml)

---

## 🎨 主要画面とデモ動作

### 🎬 デモ動作 (GIF アニメーション)
![デモ動作](screenshots/demo_animation.gif)

**このデモは以下の操作シーケンスを自動記録した GIF です:**
1. **初期表示** - アプリの起動状態
2. **新規ボタン クリック** - タスク登録モーダルを開く
3. **タイトル入力** - 「技術仕様書のレビュー」を入力
4. **日時設定** - 「日のみ指定」を選択（カレンダー日付を選択）
5. **詳細入力** - Quill リッチテキストエディタに詳細説明を入力
6. **タスク保存** - 保存ボタンでタスクを登録
7. **完了操作** - タスクを完了状態に変更
8. **フィルター** - 「完了済み」「未完了」フィルタの切り替え確認

**🔧 デモ GIF 生成コマンド:**
```bash
npm run record:demo
```

このコマンドで、以下の処理が自動実行されます:
- Playwright によるブラウザ自動操作（ヘッドフル起動でペイントプロセスを完全に処理、自動でカーソルとクリック波紋エフェクトを注入）
- ブラウザの標準ビデオ録画機能による操作全体の WebM 保存
- `ffmpeg` による高画質なカラーパレット付き GIF への一発変換
- 出力: `screenshots/demo_animation.gif`

> [!TIP]
> このマウスカーソル・クリックの可視化および高品質GIF変換の技術は、汎用的な開発スキルとして [docs/skills/browser-tests/SKILL.md](file:///Users/katoy/github/study-claude/todo-app2/docs/skills/browser-tests/SKILL.md) に定義・保存されています。別のプロジェクトでも同様の手法をすぐに再利用可能です。

### 🖥️ メイン画面 (主要画面)
![メイン画面](screenshots/main_view.png)

### 📝 詳細・編集画面 (リッチテキストエディタ)
![詳細・編集画面](screenshots/detail_view.png)

---

## ✨ アプリケーションの特徴

1. **プレミアムなダークテーマ UI**
   - 洗練されたカラーパレット（HSL）とグラデーション背景。
   - ガラスモーフィズムを用いた、美しく近未来的なデザインと滑らかな微細アニメーション。
2. **Quill v2 リッチテキスト詳細エディタ**
   - 太字・斜体・下線・取り消し線・箇条書きなどの書式サポート。
   - プレーンテキスト換算でのリアルタイムの文字数カウント（最大 2,000 文字）。
3. **直感的なカレンダー UI と一貫した日時表記・タイムゾーン制御**
   - 「指定しない」「日のみ指定」「時間と分も指定」の 3 モードに対応。
   - 前面にプレースホルダーを固定したカスタムテキストフィールド、背面に透明なブラウザ標準日付・時間ピッカーを重ね合わせた「透過レイヤー構造」を搭載。
   - すべての環境（Safari等のシステム言語設定に左右されやすいブラウザを含む）で、一貫して `年-月-日`（`YYYY-MM-DD` / `YYYY-MM-DD HH:mm`）のハイフン区切り書式で美しくプレースホルダーや入力値が表示・同期されます。
   - 右側のカレンダーアイコンまたは入力欄のクリックで、直感的なカレンダー UI ポップアップが自動で瞬時に開きます。
   - すべての締切日時を UTC 基準に補正して内部保持。
   - 日本時間（JST）に基づく「本日中」「明日まで」「それ以外」へのインテリジェントな自動セクション分類。
4. **防御的パースと強固なサニタイズ**
   - localStorage に保存されるデータのパース処理を保護し、無効なデータでのクラッシュを回避。
   - DOMPurify による厳格なサニタイズ処理を適用し、XSS（クロスサイトスクリプティング）などの脆弱性を排除。
5. **ポータブルな単一 HTML 出力**
   - Vite ビルド時に CSS および JS を完全にインライン化した、単一の HTML ファイル (`dist/index.html`) を出力。サーバーなしでのオフライン・スタンドアロン実行が可能です。

---

## 🛠️ 技術スタック

- **Core**: Vanilla JavaScript (ES Modules)
- **Styling**: Modern Vanilla CSS
- **Sanitizer**: DOMPurify
- **Rich Editor**: Quill v2 (Snow theme / Custom Dark customized)
- **Build Tool**: Vite + `vite-plugin-singlefile`
- **Testing**: Vitest + jsdom + `@testing-library/dom`
- **Linter / Formatter**: ESLint v9 (Flat Config) + Prettier + Biome

---

## 🚀 コマンドリファレンス

### パッケージのインストール
```bash
npm install
```

### ローカル開発サーバー起動
```bash
npm run dev
```

### プロダクションビルド（単一HTML出力）
`dist/index.html` に CSS/JS が内包されたスタンドアロン HTML が生成されます。
```bash
npm run build
```

### テスト実行 (Vitest)
```bash
npm run test
```

### テストカバレッジの測定
Statements, Branches, Functions, Lines の **すべてで 100% カバレッジ** を検証・保証しています。
```bash
npm run test:coverage
```

### VRT（視覚的リグレッションテスト）の実行
```bash
npm run test:vrt          # VRTテストを実行（ピクセル比較）
npm run test:vrt:update   # 基準スクリーンショット画像を生成・更新
```

### 静的解析とコード整形
```bash
npm run lint            # Linterを実行 (ESLint)
npm run lint:fix        # Linterによる自動修正
npm run format          # Prettierによるフォーマットチェック
npm run format:fix      # Prettierによる自動整形
npm run biome:check     # Biomeによる静的解析 & フォーマットチェック
npm run biome:check:fix # Biomeによる自動修正
```

### ローカルでの CI/CD 同等チェックの一括実行
CIで実行されるすべての検証ステップ（ESLint、Prettier、Biome、テスト、カバレッジ、ビルド、VRTテスト）をローカルで一括実行します。
```bash
npm run ci:check
```

### デモ GIF の生成
操作シーケンスを自動記録して、カーソルとクリックが可視化された GIF アニメーションを生成します。
```bash
npm run record:demo
# 出力: screenshots/demo_animation.gif
```

**このコマンドの詳細:**
1. Playwright でブラウザを起動し、カーソル追従・クリック波紋エフェクト用のスクリプトを注入
2. `dist/index.html` にナビゲート
3. デモシーケンスを滑らかなマウス軌跡で自動操作し、動画 (.webm) として録画
4. `ffmpeg` を呼び出し、録画した動画を高品質な GIF に変換
5. 完成した GIF を `screenshots/demo_animation.gif` に保存

※ この自動可視化デモGIF生成技術の背景と、他プロジェクトで利用できる実装テンプレートについては、[browser-tests スキル定義書](file:///Users/katoy/github/study-claude/todo-app2/docs/skills/browser-tests/SKILL.md) を参照してください。

---

## 🔒 セキュリティレビュアー（security-reviewer）による検証と監査

本プロジェクトでは、セキュリティレビュアー（`security-reviewer`）の観点に基づき、アプリケーションの堅牢性を保証するための静的解析、依存関係の脆弱性スキャン、およびデータの安全なハンドリングを導入しています。

### 1. セキュリティ設計と対策方針
* **入力・出力サニタイズ (DOMPurify)**:
  * リッチテキストエディタ（Quill）から取得するHTMLやUIの描画時に、悪意あるスクリプト（XSS）の注入を防ぐため、常に [DOMPurify](https://github.com/cure53/DOMPurify) を使用してサニタイズしています。
  * エディタ出力時およびDOMへの代入時の二重でサニタイズが適用される設計になっています。
* **静的コード解析によるサニタイズ漏れの防止 (`eslint-plugin-no-unsanitized`)**:
  * ESLint に `no-unsanitized` プラグインを導入しており、サニタイズ処理を経由せずに `.innerHTML` などのプロパティへの代入が行われた場合、自動で検知してコミットやビルドをブロックします。
* **防御的データパース**:
  * `localStorage` からのデータ復元時に、型チェックおよびUUIDの厳格な検証を行い、不正なデータが保存されていてもアプリケーションのクラッシュやデータ汚染を防ぎます。

### 2. セキュリティ検査の実行手順（利用方法）

セキュリティレビュアー（`security-reviewer`）として、コードや依存関係の安全性を検証・監査するための手順は以下の通りです。

#### A. 依存関係の脆弱性スキャン (`npm audit`)
プロジェクトで使用しているサードパーティライブラリに既知の脆弱性がないかスキャンします。
```bash
npm audit
```

#### B. 静的コード解析 (ESLint / `no-unsanitized` 検査)
ソースコード全体をスキャンし、サニタイズされていないHTMLのDOM挿入や潜在的なセキュリティリスクのある記述を検出します。
```bash
npm run lint
```
*(自動修正が可能なコード品質の問題は `npm run lint:fix` で修復できます)*

#### C. サニタイズ機能のユニットテスト
サニタイズロジックが期待通りにスクリプトタグや危険な属性（`onerror` 等）を除去しつつ、許可された装飾タグ（太字、リスト等）を維持しているかテストを実行します。
```bash
npx vitest run tests/unit/sanitize/sanitizeHtml.test.js
```

---

## 🧪 テスト詳細・品質保証

本プロジェクトでは、アプリケーションの信頼性とデザイン崩れを防ぐため、ユニットテスト・統合テストに加えて VRT（視覚的リグレッションテスト）を導入しています。

### 品質保証状況・テスト構成

| テスト種別 | 技術・ツール | テスト数 / 状態 | 目的・検証内容 |
|---|---|---|---|
| **ユニットテスト** | Vitest + jsdom | 83 件 (全件PASS) | 純粋ロジック、日付変換、サニタイズなどの検証 |
| **統合テスト** | Vitest + DOM Testing Library | (上記に内包) | タブ切り替えやダイアログ保存時のDOM連携 |
| **VRTテスト** | Playwright Test | 3 シナリオ / 6 画像比較 | 各画面（初期、モーダル、タスク追加、完了）のピクセル比較 |
| **カバレッジ保証** | `@vitest/coverage-v8` | **100%** (src/自作ロジック) | 未テストコードの目視検知と排除（CIで強制） |

### VRT（視覚的リグレッションテスト）について

VRT は Playwright を用いて、ブラウザでレンダリングされた画面のスクリーンショットをあらかじめ用意した基準（正解）画像とピクセル単位で比較し、意図しないデザインの崩れやUIバグを自動検知します。

#### 特徴と工夫
1. **時刻モックによる画面の安定化**:
   日付や時間の経過による表記の変化でVRTが誤検知（Flaky化）するのを防ぐため、Playwrightの `clock` APIを使用し、テスト中のシステム時刻を `2026-07-27 12:00:00 JST` にモック固定しています。
2. **OSごとのレンダリング差異への対応**:
   OSやフォントの違いによるアンチエイリアスの微細な差分を許容するため、Playwrightの機能を用いてOS別の基準画像（Mac用の `*-darwin.png` や Linux用の `*-linux.png` など）を自動生成し、それぞれ比較しています。
   * **Linux 用基準画像のローカル生成 (Docker 経由)**:
     ホストOS側の `node_modules` を汚染・破壊せずに Linux 環境用のスナップショットを生成するために、以下の隔離コマンドを実行します。
     ```bash
     docker run --rm -v $(pwd):/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.61.1-jammy bash -c "npm ci && npx playwright test --update-snapshots"
     ```

---

## 📂 ディレクトリ構造

```text
todo-app2/
├── dist/                          # ビルド成果物 (単一HTML)
├── docs/                          # 仕様書、テスト仕様書、成果レポート
├── screenshots/                   # アプリケーション画像、デモGIF
├── src/                           # ソースコード
│   ├── date/                      # 日付処理・変換
│   ├── editor/                    # Quillアダプター
│   ├── logic/                     # バリデーション、セクション分類、ソート
│   ├── models/                    # データ構造定義
│   ├── sanitize/                  # サニタイズ
│   ├── storage/                   # localStorage操作
│   ├── styles/                    # アプリのCSS
│   ├── ui/                        # UIビュー (メイン/詳細)
│   ├── constants.js               # アプリの定数
│   ├── index.html                 # 開発用テンプレート
│   └── main.js                    # エントリポイント
└── tests/                         # テストコード
    ├── unit/                      # ユニットテスト (Vitest)
    ├── integration/               # 統合テスト (Vitest)
    └── vrt/                       # 視覚的リグレッションテスト (Playwright)
```
