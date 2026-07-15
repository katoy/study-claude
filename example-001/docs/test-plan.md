# テスト計画: 落ちモノパズル (example-001)

- 対象: `game/index.html`
- 実施日: 2026-07-14
- 戦略: **Playwright のみ**。「単一 HTML 完結」の構成は変更しない。クラシックスクリプトのため関数・状態が `window` に露出していることを利用し、`page.evaluate` でロジックを直接検証する（ユニットテスト相当）+ 実操作を模した E2E テストを行う。
- 本計画は将来の導入手順とテストケースを定義するもので、現時点ではコード・依存関係の追加は行わない。

## 1. テスト基盤（導入時の構成）

```
example-001/
  package.json          # @playwright/test を devDependencies に追加
  playwright.config.js  # Chromium を基本。可能なら WebKit / Firefox も追加
  tests/
    logic.spec.js       # ロジックテスト（page.evaluate 経由）
    e2e.spec.js         # 操作・表示の E2E テスト
```

- ページは `file://` で `game/index.html` を直接ロードする（サーバー不要）。
- Google Fonts への外部リクエストがオフライン環境でテストを遅延させないよう、`page.route` で `fonts.googleapis.com` / `fonts.gstatic.com` を abort するか、`waitUntil: 'domcontentloaded'` で待機する。
- 実行コマンド: `npx playwright test`

## 2. 決定的化（テストの再現性）

- **乱数の固定**: `page.addInitScript` で `Math.random` をシード付き LCG に差し替え、7 バッグの出現順を固定する。

```js
await page.addInitScript(() => {
  let seed = 42;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
});
```

- **盤面の注入**: `page.evaluate` で `window.board` に任意の盤面を直接書き込み、ライン消去・ゲームオーバー等の局面を即座に構成する。
- **時間依存の排除**: 落下を待つテストは実時間待機を最小限にし、可能な限り `update()` や `currentBlock.y` を直接操作・検証する。

## 3. ロジックテスト（tests/logic.spec.js、page.evaluate 経由）

| ID | 対象 | 内容 | 期待結果 |
|----|------|------|----------|
| L-1 | canMove | 空盤面で左右・下へ移動 | true |
| L-2 | canMove | 左端 (x=0) で dx=−1、右端で dx=+1 | false |
| L-3 | canMove | 最下段で dy=+1 | false |
| L-4 | canMove | 移動先に固定ブロックがある場合 | false |
| L-5 | canMove | ブロックが盤面上端より上にはみ出すセル (y<0) | 衝突扱いにならず true |
| L-6 | rotate | 中央での回転 | 形状が転置 + 反転になる（例: I が 1×4 → 4×1） |
| L-7 | rotate | 右壁際で I ミノを回転 | 壁蹴りで x がシフトして回転成功 |
| L-8 | rotate | 全キック位置 (0, ±1, ±2) が塞がれた状態で回転 | shape と x が回転前の値に復元される |
| L-9 | clearLines | 最下段 1 ラインを埋めて実行 | 行が消え上に空行が入る。score += 100 × level、linesCleared += 1 |
| L-10 | clearLines | 2 / 3 / 4 ライン同時消去 | score がそれぞれ 300 / 500 / 800 × level 加算される |
| L-11 | clearLines | 途中に穴のある行 | 消去されない |
| L-12 | clearLines | linesCleared = 9 の状態で 1 ライン消去 | level が 1 → 2 に上がる |
| L-13 | clearLines | linesCleared = 8 の状態で 4 ライン消去（閾値またぎ） | level が 2 になる（floor(12 / 10) + 1） |
| L-14 | getRandomBlock | 連続 7 回呼び出し | 7 種 (I / O / T / S / Z / J / L) が各 1 回ずつ出る |
| L-15 | getRandomBlock | 連続 14 回呼び出し | 各種類がちょうど 2 回ずつ出る |
| L-16 | checkGameOver | スポーン位置に固定ブロックを注入して新ブロック出現 | true |
| L-17 | 落下間隔 | level = 1 / 5 / 15 で update 内の計算式を検証 | 800 / 600 / 100 ms（下限 100 でクランプ） |
| L-18 | init | ゲームオーバー後に init() | board 全消去、score = 0、level = 1、bag リセット、gameOver = false |

## 4. E2E テスト（tests/e2e.spec.js）

| ID | 対象 | 手順 | 期待結果 |
|----|------|------|----------|
| E-1 | 初期表示 | ページロード | canvas 表示、スコア 0 / レベル 1 / ライン 0、ステータスが「プレイ中」 |
| E-2 | 左右移動 | `ArrowLeft` / `ArrowRight` を押す | `currentBlock.x` が ∓1 変化する |
| E-3 | 回転 | `ArrowUp` を押す | `currentBlock.shape` が回転後の形状になる |
| E-4 | ソフトドロップ | `ArrowDown` を押す | `currentBlock.y` が +1 される |
| E-5 | ハードドロップ | `Space` を押す | ブロックが最下段まで移動する（即時固定に変更後は固定・次ブロック出現まで検証） |
| E-6 | 一時停止（キー） | `P` を押して一定時間待つ | ステータスが「一時停止中」になり `currentBlock.y` が変化しない。再度 `P` で再開 |
| E-7 | 一時停止（ボタン） | 「⏸ 一時停止」をタップ | E-6 と同じ（**C-1 修正前は失敗する回帰テスト**） |
| E-8 | タッチボタン単発性 | 左 / 右 / 回転 / 落下を 1 タップずつ | それぞれ 1 アクションのみ実行される（**C-1 の回帰テスト。修正前は failing**） |
| E-9 | キーリピート抑制 | `ArrowUp` を押しっぱなし（keydown を repeat 付きで連続送出） | 回転は 1 回のみ（**R-1 修正前は failing**） |
| E-10 | ゲームオーバー | 盤面をスポーン位置まで注入し新ブロック出現を待つ | `gameOver = true`、ステータスに「ゲームオーバー」、操作を受け付けない |
| E-11 | リスタート（キー） | ゲームオーバー後に `Enter` | 盤面・スコア・レベルが初期化されゲーム再開 |
| E-12 | リスタート（タッチ） | ゲームオーバー後にリスタート導線をタップ | ゲーム再開（**R-2 の対処実装後に有効化**） |
| E-13 | レベルアップ | `linesCleared = 9` を注入し 1 ライン消去 | レベル表示が 2 になり落下間隔が短縮される |
| E-14 | ポーズ中の入力遮断 | 一時停止中に左右・回転・ドロップを入力 | 状態が一切変化しない |
| E-15 | モバイルレイアウト | viewport を 375×667 に設定してロード | 左パネル非表示、情報パネルが横並び、縦スクロールが発生しない |

注: E-7 / E-8 / E-9 / E-12 は現状の実装では失敗する（レビュー指摘 C-1 / R-1 / R-2 の回帰テスト）。修正を行わない間は `test.fixme()` として登録し、既知の問題であることをテストコード上に記録する。

## 5. 手動テストチェックリスト

自動化が難しい項目は以下を手動で確認する。

- [ ] モバイル実機（iOS Safari / Android Chrome）でタッチ操作が機能し、1 タップ = 1 アクションであること
- [ ] 縦画面で全 UI が 1 画面に収まり、縦スクロールが発生しないこと
- [ ] 画面回転・ウィンドウリサイズ時にレイアウトが崩れないこと
- [ ] Chrome / Safari / Firefox で起動し、描画・操作・一時停止・ゲームオーバーが機能すること
- [ ] オフラインで開いた場合にフォールバックフォントで表示され、ゲームが動作すること
- [ ] キーを押したままウィンドウを切り替え、復帰後にブロックが勝手に動き続けないこと（指摘 N-1 の確認）
- [ ] 長時間プレイ（レベル 10 以上）で速度が下限 100 ms で頭打ちになり、操作が破綻しないこと

## 6. 完了基準

- `npx playwright test` で L-1〜L-18、E-1〜E-15 がすべて成功する（`test.fixme` 登録分はコード修正後に解除して成功させる）
- 手動テストチェックリストが全項目チェック済みである
- テスト導入による変更が `package.json` / `playwright.config.js` / `tests/` に閉じており、`game/index.html` の構成（単一 HTML 完結）を変えていない
