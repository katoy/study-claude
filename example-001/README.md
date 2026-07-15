# 落ちモノパズル プロジェクト (example-001)

バニラ HTML/CSS/JavaScript で記述された落ちモノパズルゲーム（テトリス風）のプロジェクトです。  
ゲーム本体は単一の HTML ファイルとして実装されており、Playwright による包括的なテストおよびカバレッジ測定環境が構築されています。

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [ディレクトリ構成](#ディレクトリ構成)
- [起動方法](#起動方法)
- [開発およびテスト](#開発およびテスト)
  - [依存関係のインストール](#依存関係のインストール)
  - [テストの実行](#テストの実行)
  - [カバレッジの確認](#カバレッジの確認)
- [コーディング規約](#コーディング規約)
- [関連資料](#関連資料)

## プロジェクト概要

このプロジェクトは、レトロな落ちモノパズルゲームを現代風のグラスモルフィズムデザインで実装したものです。
- **ゲーム本体**: [game/index.html](file:///Users/katoy/github/study-claude/example-001/game/index.html) の単一ファイルに HTML, CSS, JS のすべてが完結しています。
- **レスポンシブ対応**: PC（キーボード操作）とモバイル（タッチ操作）の両方に適応するレイアウトを採用しています。
- **自動テスト**: Playwright を用いて、コアゲームロジックおよび E2E（エンドツーエンド）テストを網羅しています。

## ディレクトリ構成

```text
example-001/
├── game/
│   ├── index.html          # ゲーム本体（単一 HTML）
│   └── README.md           # ゲームの遊び方・詳細仕様
├── tests/                  # Playwright テストコード
├── docs/                   # 仕様設計・テスト計画などのドキュメント
├── CLAUDE.md               # 開発者向けの指示書（環境・コマンド等）
├── COVERAGE.md             # テストカバレッジの分析レポート
├── plan.md                 # プロジェクト要件および実装ロードマップ
├── playwright.config.js    # Playwright の設定ファイル
└── package.json            # npm パッケージ設定
```

## 起動方法

ゲーム本体はサーバー不要でブラウザで直接動作しますが、ローカル HTTP サーバーを介しての起動も可能です。

### 1. ブラウザで直接開く
[game/index.html](file:///Users/katoy/github/study-claude/example-001/game/index.html) をお使いのウェブブラウザにドラッグ＆ドロップするか、直接開きます。

### 2. ローカルサーバー経由で開く
Python や `npx` を使ってローカルサーバーを起動します。

```bash
# Python を使用する場合
python3 -m http.server 8000

# npx (Node.js) を使用する場合
npx http-server -p 8000
```
起動後、ブラウザで `http://localhost:8000/game/` にアクセスします。

## 開発およびテスト

### 依存関係のインストール

テスト環境を実行するために、必要な npm パッケージをインストールします。

```bash
npm install
```

### テストの実行

Playwright による自動テストを実行します。46個のテストケース（ロジックテスト 19 個、描画テスト 10 個、E2Eテスト 17 個）が実行されます。

```bash
npm test
```

### カバレッジの確認とレポートの生成

現在、テストカバレッジは **100%** を達成しています。カバレッジの分析レポートについては [COVERAGE.md](file:///Users/katoy/github/study-claude/example-001/COVERAGE.md) を参照してください。

#### カバレッジレポートの生成および確認手順

以下のコマンドを実行することで、カバレッジを測定してグラフィカルな HTML レポートを自動生成できます。

```bash
npm run coverage
```

このコマンドを実行すると、自動的に以下の処理が行われます：
1. `game/index.html` の JavaScript を一時的に `game.js` に分離し、テスト用の参照構造を構築します。
2. Playwright テストを走らせ、Chromium の V8 エンジンから実行カバレッジを抽出します。
3. 取得したデータを Istanbul フォーマットに変換し、集計して `coverage/` ディレクトリに HTML レポートを生成します。
4. 元の `game/index.html` に JavaScript を埋め戻し、テストファイルを元の状態に安全に復元します。

生成完了後、ブラウザで以下のファイルを開くことで、詳細なグラフィカル・カバレッジレポートを確認できます：
- [coverage/index.html](file:///Users/katoy/github/study-claude/example-001/coverage/index.html)

## コーディング規約

プロジェクトの簡潔さを保つため、以下の規約を定義しています。詳細は [CLAUDE.md](file:///Users/katoy/github/study-claude/example-001/CLAUDE.md) をご覧ください。

- **単一 HTML の維持**: ゲームロジックは [game/index.html](file:///Users/katoy/github/study-claude/example-001/game/index.html) に記述し、新たなビルドツール（Vite, Webpack 等）の導入やモジュール分割は行わない。
- **Classic Script スタイル**: `<script type="module">` ではなく通常のスクリプトタグを使用し、`window` オブジェクトへの露出を前提とする。
- **日本語コメント**: ソースコード内のコメントや docstring は日本語で統一し、英数字と日本語の間には半角スペースを挿入する。

## 関連資料

- [game/README.md](file:///Users/katoy/github/study-claude/example-001/game/README.md) — 詳しいゲームのルールと操作方法
- [CLAUDE.md](file:///Users/katoy/github/study-claude/example-001/CLAUDE.md) — 開発環境ガイド
- [COVERAGE.md](file:///Users/katoy/github/study-claude/example-001/COVERAGE.md) — テストカバレッジ詳細レポート
- [plan.md](file:///Users/katoy/github/study-claude/example-001/plan.md) — プロジェクトの実装計画書
