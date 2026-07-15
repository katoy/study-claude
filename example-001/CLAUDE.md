# example-001 プロジェクト固有の Claude Code 指示書

## プロジェクト概要

落ちモノパズルゲーム（テトリス風）を Vanilla HTML/CSS/JavaScript で実装するプロジェクト。ビルドツールやフレームワークは使用せず、PWA に対応したオフライン動作環境を提供します。

## 技術スタック

- **言語・フレームワーク**: Vanilla HTML/CSS/JavaScript のみ（フレームワーク・npm ビルドツール一切使用しない）
- **スクリプト形式**: Classic `<script>` タグ（`type="module"` ではない）。関数・状態が `window` に露出する構成のため、その前提を維持する
- **外部依存**: Google Fonts（Inter, Orbitron）の `<link>` タグのみ
- **ファイル構成**: ビルド不要な静的アセット（HTML, CSS, Service Worker, Web Manifest, アイコン画像）で構成され、PWA に対応
- **PWA 対応**: Service Worker (`sw.js`) によるアセットキャッシュおよびオフライン起動、`manifest.json` によるネイティブアプリ風のインストールに対応

## ディレクトリ構成

```
example-001/
  game/
    index.html      # ゲーム本体
    style.css       # 外部化したゲーム用 CSS
    manifest.json   # PWA 用アプリ設定
    sw.js           # キャッシュとオフライン起動用 Service Worker
    icon-192.png    # PWA 用アプリアイコン (192x192)
    icon-512.png    # PWA 用アプリアイコン (512x512)
    README.md       # 操作方法・起動手順
  plan.md           # プロジェクト要件定義
  docs/
    spec-structure-review.md  # 仕様・構造レビュー（参考）
    test-plan.md              # テスト計画（参考）
```

## 起動方法

1. **ブラウザで直接開く**: `game/index.html` をウェブブラウザで開く
2. **HTTP サーバー経由**:
   ```bash
   python3 -m http.server 8000
   # または
   npx http-server -p 8000
   ```
   その後 `http://localhost:8000/game/` にアクセス

## コーディング規約

### ビルド不要な構成の維持

- 新規のビルドステップ（Webpack、Vite、TypeScript コンパイルなど）を追加しない
- フロントエンドアセット（HTML、CSS、マニフェスト、サービスワーカー等）はそのまま配信可能な静的ファイルとして扱い、トランスパイルやバンドルのプロセスは導入しない
- JavaScript は Classic Script として `index.html` 内の `<script>` にインライン記述し、CSS は `style.css` に配置する

### Classic Script スタイルの維持

- `<script type="module">` への変更は避ける
- `window` への露出を前提とした設計を維持する
- 既存の関数・状態構造を尊重し、急激な再設計は避ける

### コメント・ドキュメント

- コメント・docstring は日本語で記述（グローバル設定に準拠）
- 半角スペースの挿入ルール: ASCII 文字・数字と全角日本語の間に半角スペースを入れる
  - 例: `// multiply(a, b) に 2 つの数値の積を float で返す` ✓
  - 例: `// multiply(a, b)に2つの数値の積を float で返す` ✗

### マジックナンバー・定数

- `10`（盤面幅）、`20`（盤面高さ）などのゲームパラメータは定数として定義し、ハードコード化を避ける

## テスト

Playwright を用いた自動テストスイートが導入されています。テスト実行とカバレッジ計測用のコマンドは以下の通りです。
- テスト実行: `npm test` または `npx playwright test`
- カバレッジ計測: `npm run coverage` (HTML から一時的に JS を分離して V8 カバレッジを収集し、自動的に復元する)
- 静的検証: `npm run lint` (ESLint によるコード検証)

## 参考資料

- `game/README.md` — 操作方法、ゲームルール詳細
- `plan.md` — プロジェクト要件定義
- `docs/spec-structure-review.md` — 仕様・構造の既知問題（参考）
- `docs/test-plan.md` — テスト計画案（参考）
