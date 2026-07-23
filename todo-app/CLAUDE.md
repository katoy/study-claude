# CLAUDE.md - ToDo App 開発ガイド

## 技術スタック・制約

- **単一HTMLファイル** (`index.html`): CSS・JavaScript をすべてインラインで記述
- **外部ライブラリ**: Quill (リッチテキストエディタ) を CDN から読み込み
- **データ永続化**: localStorage（キー: `todo-app-items`）
- **サーバー不要**: ブラウザで直接開いて動作

## ファイル構成

```
todo-app/
├── index.html          # アプリ本体（HTML + CSS + JS 全て含む）
├── docs/
│   ├── spec.md         # 仕様書
│   ├── main.jpg        # メイン画面ワイヤーフレーム (スケッチ)
│   └── detail.jpg      # 詳細画面ワイヤーフレーム (スケッチ)
└── CLAUDE.md           # このファイル
```

## コーディング規約

- **UI言語**: すべて日本語
- **コメント**: 日本語で記述
- **変数名・関数名**: 英語（キャメルケース）
- **CSS**: `<style>` タグ内に記述
- **JavaScript**: `<script>` タグ内に記述（`</body>` 直前）
- **ID生成**: `crypto.randomUUID()` を使用

## Quill CDN

```html
<link href="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js"></script>
```

ツールバー構成: 太字、イタリック、下線、箇条書きリスト、番号付きリスト

## localStorage

- キー: `todo-app-items`
- 値: ToDoアイテムのJSON配列
- 読み書きは `JSON.parse` / `JSON.stringify` で行う

## 仕様書

詳細な仕様は `docs/spec.md` を参照。
