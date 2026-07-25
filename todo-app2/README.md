# Premium ToDo App

洗練されたダークテーマデザインとリッチテキストエディタ（Quill）を融合させ、TDD（テスト駆動開発）によって堅牢に実装されたモダンなシングルファイル型 ToDo アプリケーションです。

🚀 **デプロイ先 (GitHub Pages):** [https://katoy.github.io/study-claude/todo-app2/](https://katoy.github.io/study-claude/todo-app2/)

[![ToDo App 2 CI](https://github.com/katoy/study-claude/actions/workflows/todo-app2-ci.yml/badge.svg)](https://github.com/katoy/study-claude/actions/workflows/todo-app2-ci.yml)

---

## 🎨 主要画面とデモ動作

### 🎬 デモ動作 (GIF アニメーション - マウス位置・クリック表示)
![デモ動作](screenshots/demo.gif)

**📌 デモGIFについて:**
このデモGIFにはマウスカーソルの位置とクリック位置が可視化されています。グローバル設定ファイルにより、複数プロジェクト間で統一されたマウス・クリック表示設定が適用されています。

**🔧 グローバル設定の場所:**
`~/.copilot/global-config/demo-recording.json` に統一されたマウス・クリック可視化設定が保存されています。

**設定内容:**
- ✅ マウスカーソル表示：有効（赤色, 12px）
- ✅ クリック位置表示：有効（赤色リップル, 30px半径）
- ✅ クリック表示時間：200ms
- ✅ フレームレート：30fps
- ✅ 出力形式：GIF

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
- **Linter / Formatter**: ESLint v9 (Flat Config) + Prettier

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

### 静的解析とコード整形
```bash
npm run lint      # Linterを実行
npm run lint:fix  # Linterによる自動修正
npm run format    # Prettierによるフォーマットチェック
npm run format:fix# Prettierによる自動整形
```

### デモレコーディング設定の確認
```bash
# グローバル設定を読み込んで、プロジェクト設定を統合・表示
node scripts/setup-demo-recording.js
```

---

## 🎥 グローバルデモレコーディング設定

複数プロジェクト間で統一されたスクリーンレコーディング設定をグローバルに管理しています。

### 📍 設定ファイルの場所
- **グローバル設定**: `~/.copilot/global-config/demo-recording.json`
- **ツール**: `~/.copilot/global-config/demo-recording-tool.js`
- **プロジェクト統合**: `scripts/setup-demo-recording.js`

### 🔧 グローバル設定の内容

```json
{
  "screenRecording": {
    "showMouseCursor": true,        // マウスカーソルを可視化
    "showClickIndicator": true,      // クリック位置を可視化
    "clickRadius": 20,               // クリック検出半径
    "clickDuration": 200,            // クリック表示時間（ms）
    "cursorColor": "#FF0000",        // カーソル色（赤）
    "cursorSize": 12,                // カーソルサイズ（px）
    "clickIndicatorColor": "#FF4444",// クリック表示色
    "clickRippleRadius": 30,         // クリックリップル半径（px）
    "frameRate": 30,                 // フレームレート（fps）
    "quality": "high",               // 品質
    "format": "gif"                  // 出力形式
  }
}
```

### ✨ マウス・クリック可視化の特徴

| 機能 | 説明 |
|------|------|
| **マウスカーソル表示** | 赤色の12px円形カーソルがマウスに追従 |
| **クリック位置表示** | クリック時に赤色のリップルエフェクト（30px半径）が200ms表示 |
| **複数プロジェクト対応** | 他のプロジェクト（`contact-form` など）でも同じ設定が適用 |
| **永続化** | `~/.copilot/global-config/` に保存され、セッション間で維持 |

### 🎬 デモ用スクリーンレコーディングの生成例

```bash
# グローバル設定を確認
node ~/.copilot/global-config/demo-recording-tool.js

# プロジェクト固有の統合設定を確認
npm run setup:demo
```

---

## 📂 ディレクトリ構成

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
└── tests/                         # 単体および統合テストコード
```
