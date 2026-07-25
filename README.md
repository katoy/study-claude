# Study Claude (Web アプリケーション学習リポジトリ)

このリポジトリは、AI アシスタント Claude を活用しながら開発・検証した、複数の Web アプリケーションと自動テスト環境（CI/CD）をまとめた統合学習リポジトリです。

---

## 🚀 プロジェクト一覧

本リポジトリには、技術スタックや用途が異なる以下の5つのプロジェクトが含まれています。

### 1. [お問い合わせフォーム (contact-form)](file:///Users/katoy/github/study-claude/contact-form/myproject/README.md)
* **概要**: Laravel 13.x で構築した本格的なお問い合わせフォームアプリケーション。
* **主な機能**: 
  * 一般ユーザー向けの3ステップ入力・確認・送信フロー
  * 管理者向けの問い合わせ一覧・詳細・ステータス管理機能（Laravel Breeze認証）
* **技術スタック**: PHP 8.3 (Laravel 13.x), Tailwind CSS, SQLite

### 2. [落ちモノパズルゲーム (example-001)](file:///Users/katoy/github/study-claude/example-001/README.md)
* **概要**: バニラ HTML/CSS/JavaScript で記述されたレトロスタイルの落ちモノパズルゲーム（テトリス風）。
* **主な機能**:
  * グラスモルフィズムを用いたモダンなUIデザイン
  * PC（キーボード）およびモバイル（タッチ操作）のマルチデバイス対応
* **技術スタック**: Vanilla HTML/CSS/JavaScript, Playwright (E2Eテスト)

### 3. [ToDoリスト アプリ (todo-app)](file:///Users/katoy/github/study-claude/todo-app/README.md)
* **概要**: インラインで完結した、プレミアムなダーク／ネオンテーマ仕様のタスク管理アプリ。
* **主な機能**:
  * 締め切り日時に応じたリアルタイム自動セクション分類
  * Quill リッチテキストエディタによる詳細なタスク記述の入力サポート
  * `localStorage` を使用したデータの永続化
* **技術スタック**: Vanilla HTML/CSS/JS (単一 index.html 構成), Quill, Playwright (E2Eテスト)

### 4. [Premium ToDo App (todo-app2)](file:///Users/katoy/github/study-claude/todo-app2/README.md)
* **概要**: TDD（テスト駆動開発）によって堅牢に実装された、モダンでプレミアムな ToDo アプリケーション。
* **主な機能**:
  * Quill エディタを統合したタスク作成モーダル
  * 100%のカバレッジ要件チェックを備えた高品質なコードベース
* **技術スタック**: React / Vite / TypeScript, Jest / Vitest, Prettier, ESLint

### 5. [PDF Label Studio (pdflabel)](file:///Users/katoy/github/study-claude/pdflabel/README.md)
* **概要**: 市販のA4ラベル用紙などの寸法に合わせて、任意の印刷用PDFをブラウザ内で完全ローカル生成するツール。
* **主な機能**:
  * アカウント登録やサーバー送信不要で動作する完全クライアントサイド設計
  * 用途に合わせた豊富なラベル寸法プリセット機能
* **技術スタック**: Vanilla HTML/CSS/JS, jsdom, Vitest (ユニットテスト & カバレッジ計測), HTMLHint

---

## 🛠️ GitHub Actions (CI/CD) の構成

リポジトリ全体の品質維持とデプロイ自動化のために、以下の統合ワークフローが定義されています。

* [all-projects-ci.yml](file:///Users/katoy/github/study-claude/.github/workflows/all-projects-ci.yml)

### 特徴とワークフローの仕組み

1. **差分ベースの変更検知 (Change Detection)**
   * `dorny/paths-filter` を使用し、プルリクエストやプッシュの際に対象ディレクトリでファイルの変更があったかどうかを自動で検知します。
2. **並列 CI ジョブの実行**
   * 変更が検知されたプロジェクトの CI ジョブのみが個別に起動し、テストや静的解析（Linter/HTMLHint等）を並列で実行します。変更がなかったプロジェクトのジョブは自動的にスキップされ、Actions の実行枠と時間を節約します。
3. **GitHub Pages への一括自動デプロイ**
   * `main` ブランチにプッシュされ、かつ CI テストがすべて正常終了した場合に、静的アプリ（`todo-app`, `todo-app2`, `example-001`, `pdflabel`）を自動ビルドし、GitHub Pages へ一括デプロイします。
   * それぞれ以下のサブディレクトリ構造でデプロイされます：
     * ToDoリスト (todo-app) -> `https://<user>.github.io/study-claude/todo-app/`
     * Premium ToDo App (todo-app2) -> `https://<user>.github.io/study-claude/todo-app2/`
     * 落ちモノパズル (example-001) -> `https://<user>.github.io/study-claude/example-001/`
     * PDF Label Studio (pdflabel) -> `https://<user>.github.io/study-claude/pdflabel/`

---

## 💡 共通ツール・スキル

本リポジトリには、開発やデモンストレーションに活用できる共通のツールおよびガイドラインが同梱されています。

### [ブラウザテスト & デモGIF生成スキル (skills/browser-tests)](file:///Users/katoy/github/study-claude/skills/browser-tests/SKILL.md)
* **概要**: Playwright (Node.js) と FFmpeg を使用して、Web アプリのブラウザ操作デモ動画を撮影し、高品質・軽量な GIF アニメーションを生成するためのガイドラインおよびテンプレート。
* **特徴**:
  * **仮想マウスカーソル・クリック波紋の挿入**: Playwright での録画では記録されないマウス操作を、独自のスクリプトインジェクションによって視覚的に再現。
  * **スムーズなマウス移動**: デモ映像として違和感がないよう、カーソルを滑らかに対象要素まで移動させてからクリック・入力する API を完備。
  * **FFmpeg による高画質GIF化**: 動画特有の最適化カラーパレットを作成し、ノイズの少ない綺麗なGIFを出力。

### [README.md 作成・構成スタイルガイド (skills/readme-style)](file:///Users/katoy/github/study-claude/skills/readme-style/SKILL.md)
* **概要**: リポジトリ全体のプロジェクトで統一された、高品質で視覚的な `README.md` を作成・保守するための構成・書式・記述テンプレートに関するガイドライン。
* **特徴**:
  * **標準セクション構造**: デモ、画面遷移図、機能詳細、要件、主要コマンド等の最適な目次構成を提示。
  * **視覚的な Mermaid フローチャートと配色**: パブリック/プライベート画面に応じた色分け済みの Mermaid テンプレート。
  * **マークダウン表現のベストプラクティス**: Callouts (Tip, Warning 等) の活用や、ファイルリンクの記法ルール。

---

## 💻 開発環境のセットアップ

各サブプロジェクトは独立した Node.js または PHP 動作環境を持っています。
ローカルで起動・テストする際は、それぞれのプロジェクトのディレクトリに移動して実行します。

### 例：Premium ToDo App (`todo-app2`) の場合
```bash
cd todo-app2
npm install     # 依存関係のインストール
npm run dev     # 開発サーバー起動
npm run lint    # 静的解析
npm run test    # テストの実行
```

各プロジェクトの具体的なコマンドや設定、要件についての詳細は、各プロジェクトディレクトリ内の `README.md` をご参照ください。
