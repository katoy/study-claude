# PDF Label Studio

市販のA4ラベル用紙または任意の寸法に合わせて、同じテキストを並べた印刷用PDFをブラウザ内で生成するWebアプリケーションです。アカウント登録やアプリケーション固有のサーバーへの本文送信は不要です。

[PDF Label Studioを開く](https://katoy.github.io/study-claude/pdflabel/)

![PDF Label Studioの画面](screenshots/app_screenshot.jpg)

## 目次

- [主な機能](#主な機能)
- [使い方](#使い方)
  - [プリセット選択のキーボード操作](#プリセット選択のキーボード操作)
  - [プレビュー操作](#プレビュー操作)
- [動作要件](#動作要件)
- [技術構成](#技術構成)
- [開発](#開発)
  - [セットアップ](#セットアップ)
  - [コマンド](#コマンド)
- [CI/CD](#cicd)
- [リポジトリ構成](#リポジトリ構成)
- [ライセンス](#ライセンス)

## 主な機能

- **51種類の用紙プリセット**: エーワン、コクヨ、ヒサゴ、エレコム、プラス、サンワサプライのA4ラベル用紙を収録しています。
- **視覚的なプリセット選択**: 用紙レイアウトの縮小SVG、寸法、面数、列数・行数をカードで比較できます。メーカー別の絞り込みと検索にも対応しています。
- **カスタムレイアウト**: 上下左右の余白、ラベル幅・高さ、列間隔・行間隔を0.1mm単位で調整できます。
- **リアルタイムA4プレビュー**: 入力内容、枠線、余白、ラベル配置、列数・行数・総面数を即時に確認できます。
- **ズームとパン**: ボタン、ホイール、ドラッグ、タッチ、ピンチ操作でプレビューを拡大縮小・移動できます。
- **日本語PDF**: Noto Sans JPをPDFに埋め込み、複数行、自動折り返し、印字領域の高さ制限に対応します。
- **完全クライアントサイド処理**: 入力したラベル本文はアプリケーションからサーバーへ送信されません。

## 使い方

1. [公開版](https://katoy.github.io/study-claude/pdflabel/)を開くか、ローカルの [index.html](index.html) をブラウザで開きます。
2. 「型番・プリセット」を押し、用紙カードを選択します。メーカータブや検索欄で候補を絞り込めます。
3. 必要に応じて余白、ラベル寸法、ラベル間隔を編集します。編集すると「カスタムレイアウト」に切り替わります。
4. 全ラベルに印字するテキスト、文字サイズ、内余白、枠線の有無を設定します。
5. A4プレビューと列数・行数・総面数を確認します。
6. 「PDFを生成して開く」を押します。生成されたPDFは新しいタブで表示されます。

### プリセット選択のキーボード操作

| キー | 操作 |
| --- | --- |
| `ArrowLeft` / `ArrowRight` | 前後のカードへ移動 |
| `ArrowUp` / `ArrowDown` | 上下のカードへ移動 |
| `Enter` / `Space` | フォーカス中のカードを選択 |
| `Escape` | ダイアログを閉じる |

### プレビュー操作

| 操作 | 結果 |
| --- | --- |
| 「小」「中」「大」 | A4プレビューのベース表示サイズを変更 |
| `-` / `+` ボタン | 30%から300%の範囲で縮小・拡大 |
| リセットボタン | 拡大率と表示位置を初期状態に戻す |
| ドラッグ / 1本指ドラッグ | プレビューを移動 |
| ホイール | 縦方向へ移動 |
| `Shift` + ホイール | 横方向へ移動 |
| `Ctrl` + ホイール / ピンチ | ポインター位置を基準に拡大・縮小 |

青い点線はページ余白のガイドで、生成したPDFには出力されません。

## 動作要件

- A4縦（210mm x 297mm）を前提としたレイアウトです。
- 最新のChrome、Edge、Firefox、Safariなど、Blob URLとES6をサポートするブラウザが必要です。
- jsPDF、画面表示用フォント、PDF埋め込み用Noto Sans JPをCDNから取得します。ローカルで `index.html` を直接開く場合も、初回表示とPDF生成にはインターネット接続が必要です。
- ポップアップを制限しているブラウザでは、生成PDFの新しいタブを許可してください。

## 技術構成

- HTML5 / CSS3
- Vanilla JavaScript
- [jsPDF](https://github.com/parallax/jsPDF)
- Noto Sans JP / Outfit
- [Vitest](https://vitest.dev/) + [JSDOM](https://github.com/jsdom/jsdom)
- GitHub Actions / GitHub Pages

アプリケーション本体は [index.html](index.html) の単一ファイルにHTML、CSS、JavaScriptをまとめています。用紙データだけを [labellist.js](labellist.js) に分離し、開発用ビルドなしで `file://` からも起動できる構成です。

レイアウト計算はプレビューとPDF生成で共有されます。A4の印字可能領域から、次の式で最大列数・行数を求めます。

```text
columns = floor((availableWidth + columnSpacing) / (labelWidth + columnSpacing))
rows    = floor((availableHeight + rowSpacing) / (labelHeight + rowSpacing))
```

入力範囲外の寸法や、描画負荷を避けるため総面数が1000面を超えるレイアウトは配置不能として警告します。

## 開発

### セットアップ

CIと同じNode.js 20系を推奨します。

```bash
npm ci
```

### コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run test` | Vitestを1回実行 |
| `npm run test:watch` | Vitestをウォッチモードで実行 |
| `npm run test:coverage` | V8カバレッジを測定し、100%閾値を検証 |
| `npm run lint:html` | ローカルに固定したHTMLHintでHTMLを静的検証 |

テスト前に `scripts/extract-script.js` が `index.html` のインラインJavaScriptを一時ファイル `index.js` へ抽出し、テスト後に削除します。`index.js` と `coverage/` は生成物のためコミットしません。

[vitest.config.js](vitest.config.js) は `index.js` と `labellist.js` に対し、ステートメント、ブランチ、関数、行のカバレッジ閾値をすべて100%に設定しています。

## CI/CD

[GitHub Actionsワークフロー](../.github/workflows/pdflabel-ci.yml) は、`main` へのpushまたはpull requestで `pdflabel/**` に変更がある場合に次を実行します。

1. Node.js 20で `npm ci`
2. HTMLHintによる `index.html` の検証
3. `npm run test:coverage`
4. カバレッジ結果をJob Summaryと14日間保持される `pdflabel-coverage-report` artifactへ出力

`main` へのpushでは、親リポジトリの[Pages配信ワークフロー](../.github/workflows/ci-cd.yml)がリポジトリ全体をデプロイします。反映後のアプリはGitHub Pagesの[公開版](https://katoy.github.io/study-claude/pdflabel/)で確認できます。

## リポジトリ構成

```text
study-claude/
├── .github/
│   └── workflows/
│       ├── ci-cd.yml           # GitHub Pagesへの配信
│       └── pdflabel-ci.yml     # テストとカバレッジのCI
└── pdflabel/
    ├── CLAUDE.md               # 開発エージェント向けの仕様と作業規約
    ├── LICENSE                 # MITライセンス本文
    ├── README.md                # 利用者・開発者向けドキュメント
    ├── index.html               # アプリ本体（HTML/CSS/JavaScript）
    ├── labellist.js             # 用紙プリセット
    ├── package.json             # npmスクリプトと開発依存
    ├── robots.txt               # クローラー設定
    ├── vitest.config.js         # テスト・カバレッジ設定
    ├── scripts/
    │   └── extract-script.js    # インラインJavaScript抽出
    ├── test/
    │   └── index.test.js        # Vitestテスト
    ├── docs/                    # 提案・コードレビュー記録
    └── screenshots/
        └── app_screenshot.jpg   # README用スクリーンショット
```

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
