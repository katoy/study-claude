# ToDo アプリ（書籍サンプル）

単一の HTML ファイルだけで動作する、ブラウザ完結型の ToDo アプリのサンプルプロジェクトです。CSS・JavaScript はすべて `index.html` にインラインで記述されており、データは `localStorage` に保存されます。仕様の詳細は [`docs/spec.md`](docs/spec.md)、テストケースは [`docs/test-case.md`](docs/test-case.md)、開発時のルールは [`CLAUDE.md`](CLAUDE.md) を参照してください。

ワイヤーフレーム（`main.jpg`・`detail.jpg`）は、Claude Code に画面を作らせる際のプロンプトで利用することを想定しています。

## 必要環境

- モダンなウェブブラウザ（Chrome / Edge / Firefox など）
- Node.js / npm（Playwright によるテストを実行する場合のみ）

リポジトリ同梱の `.devcontainer` を使えば、VS Code の Dev Containers 拡張で上記が揃った環境がそのまま起動します。

## アプリの起動

サーバーは不要です。`index.html` をブラウザで直接開くだけで動作します。

```bash
# 例: macOS
open index.html

# 例: Linux
xdg-open index.html
```

リッチテキストエディタの [Quill](https://quilljs.com/) は CDN から読み込むため、初回起動時はインターネット接続が必要です。

ブラウザで開いたら、次のような操作で動作確認できます。

| 操作 | 内容 |
| --- | --- |
| [新規] | 詳細画面（モーダル）を開いて ToDo を追加 |
| タイトルをクリック | 既存の ToDo を編集 |
| [完了] | 完了 / 未完了をトグル |
| [完済を削除] | 完了済みの ToDo を一括削除 |
| タブ切り替え | 「すべて」「未完了」「完了済」で表示を絞り込み |

データはブラウザの `localStorage`（キー: `todo-app-items`）に保存され、ブラウザを閉じても保持されます。

## テスト

Playwright による E2E テストを同梱しています。初回のみ依存パッケージとブラウザをインストールしてください。

```bash
npm install
npx playwright install
```

テストの実行は次のコマンドです。

```bash
npm test
```

## ライセンス

本サンプルが利用している [Quill](https://github.com/slab/quill) および [Playwright](https://github.com/microsoft/playwright) は、いずれも MIT License で配布されています。
