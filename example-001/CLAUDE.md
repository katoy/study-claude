# example-001 プロジェクト固有の Claude Code 指示書

## プロジェクト概要

落ちモノパズルゲーム（テトリス風）を Vanilla HTML/CSS/JavaScript で実装するプロジェクト。`game/index.html` に単一 HTML ファイルとして完結しており、ビルドツールやフレームワークは使用していません。

## 技術スタック

- **言語・フレームワーク**: Vanilla HTML/CSS/JavaScript のみ（フレームワーク・npm ビルドツール一切使用しない）
- **スクリプト形式**: Classic `<script>` タグ（`type="module"` ではない）。関数・状態が `window` に露出する構成のため、その前提を維持する
- **外部依存**: Google Fonts（Inter, Orbitron）の `<link>` タグのみ
- **ファイル構成**: 単一 HTML ファイル (`game/index.html`) で全機能が完結

## ディレクトリ構成

```
example-001/
  game/
    index.html      # ゲーム本体（891行の単一ファイル）
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

### 単一 HTML 完結の維持

- 新規のビルドステップ（Webpack、Vite、TypeScript コンパイルなど）を追加しない
- ファイルを分割する際も、最終的には単一 HTML に埋め込むか、最小限の HTTP 配信で完結させる
- CSS・JavaScript は `<style>` / `<script>` タグ内にインラインで記述する

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

現時点（2026-07-14）では自動テストが未導入です。`docs/test-plan.md` に Playwright による将来のテスト計画が記載されていますが、実装はまだです。

## 参考資料

- `game/README.md` — 操作方法、ゲームルール詳細
- `plan.md` — プロジェクト要件定義
- `docs/spec-structure-review.md` — 仕様・構造の既知問題（参考）
- `docs/test-plan.md` — テスト計画案（参考）
