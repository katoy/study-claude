# PDF Label Studio

## プロジェクト概要

A4ラベル用紙向けのPDFをブラウザ内で生成する、サーバー不要のWebアプリケーション。市販用紙のプリセットまたはユーザー指定の寸法からラベル配置を計算し、同じテキストを全ラベルに印字する。

本番環境: <https://katoy.github.io/study-claude/pdflabel/>

## アーキテクチャ

- `index.html`: アプリ本体。HTML、CSS、UIロジック、レイアウト計算、PDF生成を1ファイルにまとめる
- `labellist.js`: `const labelList = [...]` 形式のラベル用紙プリセット。`file://` で直接開ける構成を維持する
- `scripts/extract-script.js`: `index.html` のインラインJavaScriptをテスト用の一時ファイル `index.js` に抽出する
- `test/index.test.js`: Vitest + JSDOMによるUI、レイアウト計算、PDF生成、プリセット操作のテスト
- `vitest.config.js`: `index.js` と `labellist.js` に対するカバレッジ100%閾値を定義する
- `README.md`: 利用方法、機能、開発手順を記載する公開ドキュメント

ランタイムの自前コードにビルド工程やサーバーはない。jsPDF、UI用Webフォント、PDF埋め込み用Noto Sans JPはCDNから取得するため、初回利用時とPDF生成時にはインターネット接続が必要になる。

## 現行仕様

### 用紙とレイアウト

- 用紙サイズはA4縦（210mm x 297mm）
- エーワン、コクヨ、ヒサゴ、エレコム、プラス、サンワサプライの計51プリセットを収録する
- カスタムレイアウトでは上下左右の余白、ラベル幅・高さ、列間隔・行間隔を0.1mm単位で編集できる
- 列数と行数は次の式で計算し、プレビューとPDF生成で同じ `calculateLayout()` の結果を使う

```text
columns = floor((availableWidth + columnSpacing) / (labelWidth + columnSpacing))
rows    = floor((availableHeight + rowSpacing) / (labelHeight + rowSpacing))
```

- 無効値や配置不能な寸法では列数・行数を0として警告を表示する
- 描画負荷を避けるため、総面数が1000面を超えるレイアウトも列数・行数を0として警告を表示する
- ラベル内余白のデフォルトは2mm、枠線は既定で有効

### テキストとPDF

- 全ラベルに同じテキストを左上揃えで印字する
- 複数行とラベル幅に応じた自動折り返しに対応する
- ラベルの印字可能高さを超えた行は出力しない
- フォントサイズのデフォルトは10pt、指定範囲は4ptから72pt
- Noto Sans JPをjsPDFに登録して日本語を出力する
- 生成したPDFはBlob URLとして新しいタブで開く

### プリセット選択UI

- プリセットカードには縮小SVG、寸法、面数、列数・行数を表示する
- 余白、間隔、角丸、面数の透かし、現在のレイアウトとの比較を縮小SVGに反映する
- メーカータブと、メーカー名・面数・寸法・用紙サイズの検索で絞り込める
- 矢印キーでカード間を移動し、`Enter` または `Space` で選択、`Escape` で閉じる

### A4プレビュー操作

- 入力変更をリアルタイムに反映し、列数・行数・総面数を表示する
- ベース表示サイズを小・中・大から選択できる
- ボタン、`Ctrl` + ホイール、ピンチ操作で30%から300%まで拡大縮小できる
- マウスドラッグまたは1本指ドラッグで移動できる
- 通常のホイールで縦横に移動し、`Shift` + ホイールで横方向に移動できる
- 青い点線の余白ガイドはPDFに出力しない

## コーディング規約

- JavaScriptの変数名・関数名にはcamelCaseを使う
- コメントは日本語で書き、処理の意図がコードだけでは明確でない場合に限定する
- アプリ本体のHTML、CSS、JavaScriptは `index.html` に置き、自前の外部CSS・JSへ分割しない
- 用紙プリセットだけは `labellist.js` に置く。JSON化やモジュール化により `file://` 実行を壊さない
- 外部ランタイム依存はCDNから読み込めるが、追加時は読み込み失敗時のエラー経路も実装・テストする
- レイアウト計算をプレビュー用とPDF用に重複実装しない
- プリセットのデータ構造を変更した場合は、既存データとの後方互換性と縮小SVG表示を確認する

## 作業ルール

- 作業開始時に親リポジトリで `git status --short` を確認し、既存の未コミット変更を上書きしない
- 変更前に保存点となるgit commitが必要な場合は、ユーザーの既存変更を勝手に含めず確認を取る
- 機能またはテストを変更した場合は `npm run test:coverage` を実行し、ステートメント、ブランチ、関数、行のカバレッジ100%を維持する
- HTMLを変更した場合は `npm run lint:html` も実行する
- テスト時に生成される `index.js` と `coverage/` はコミットしない
- `pdflabel/` は親リポジトリ `study-claude` で管理する。このディレクトリ内に別の `.git` を作らない
- commit、push、PR作成は依頼された場合のみ親リポジトリから実行する。`main` へのpushでGitHub Pagesが更新される

## 開発・検証コマンド

```bash
npm ci                  # lockfileに従って開発依存をインストール
npm run test            # Vitestを1回実行
npm run test:watch      # Vitestのウォッチモード
npm run test:coverage   # 100%閾値付きカバレッジ検証
npm run lint:html       # HTMLの静的検証
```

`pretest*` が `index.js` を生成し、`posttest*` が削除する。テストが異常終了して残った場合も、内容を編集したりコミットしたりしない。
