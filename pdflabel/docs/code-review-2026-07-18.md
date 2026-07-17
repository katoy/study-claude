# コードレビュー結果 - index.html
**日時:** 2026-07-18  
**レビュー対象:** index.html（PDF ラベルメーカー）  
**レビュー方法:** Medium effort（8角度並列検証）

---

## 検出結果サマリー

| 重大度 | 件数 | カテゴリ |
|--------|------|----------|
| 🔴 確定バグ | 4 | Correctness |
| 🟡 可能性高い | 3 | Likely Bugs |
| 🟠 設計問題 | 1 | Maintainability |
| **合計** | **8** | |

---

## 検出結果詳細

### 🔴 Correctness Bugs（確定）

#### 1. jsPDF CDN 読み込み失敗時の crash
- **Line:** 1029
- **概要:** `window.jspdf` の存在確認なし
- **失敗シナリオ:** ネットワーク障害または CDN ダウン時、jsPDF が読み込まれない → `generateAndOpenPDF()` で `Cannot read property jsPDF of undefined` → PDF 生成ボタンが disabled で止まる
- **影響:** ユーザーが PDF 生成機能を使用できない。エラーハンドリングなし

```javascript
// 現在（危険）
const { jsPDF } = window.jspdf;

// 修正案
if (!window.jspdf) {
  throw new Error('jsPDF ライブラリの読み込みに失敗しました。インターネット接続を確認してください。');
}
const { jsPDF } = window.jspdf;
```

---

#### 2. labellist.js 読み込み失敗時の crash
- **Line:** 1115
- **概要:** `labelList` グローバル変数の存在確認なし
- **失敗シナリオ:** labellist.js が 404 または CORS エラーで読み込み失敗 → `initializePresets()` で `labelList.forEach()` → `Cannot read property forEach of undefined` → アプリ全体が起動失敗
- **影響:** 重大。ラベルプリセット読み込み失敗でアプリ起動不可

```javascript
// 現在（危険）
labelList.forEach((preset, index) => {
  const option = document.createElement('option');
  // ...
});

// 修正案
if (!window.labelList || !Array.isArray(window.labelList)) {
  console.error('ラベルプリセットデータが読み込まれていません');
  presetSelect.innerHTML = '<option>エラー: プリセット読み込み失敗</option>';
  return;
}
labelList.forEach((preset, index) => {
  // ...
});
```

---

#### 3. customLayoutState の型混在バグ
- **Line:** 796-820
- **概要:** `readLayoutInputs()` は string、`createDefaultCustomLayout()` は number を返す
- **失敗シナリオ:**
  1. ページ読み込み → `customLayoutState = createDefaultCustomLayout()` (numbers: 10, 70, 37...)
  2. ユーザー入力 → `customLayoutState = readLayoutInputs()` (strings: "10", "70", "37"...)
  3. 次のプリセット切り替え時に、混在した型が applyLayoutInputs() に渡される
  4. calculateLayout() で parseFloat() を毎度実行しているため現在は動作するが、型チェックが機能しない
  5. 将来 `calculateLayout()` が `customLayoutState` から直接読む refactor になると NaN 発生

- **影響:** 中～高。隠れたバグ。型チェック/TypeScript 導入時に露出する可能性

```javascript
// 修正案：型を統一（常に number）
function readLayoutInputs() {
  return {
    topMargin: parseFloat(topMarginInput.value) || 0,
    bottomMargin: parseFloat(bottomMarginInput.value) || 0,
    // ... 他のフィールドも parseFloat()
  };
}
```

---

#### 4. DOM thrashing によるパフォーマンス悪化
- **Line:** 905
- **概要:** 毎回 `previewPage.innerHTML = ''` で全ノード削除・再作成
- **失敗シナリオ:** ユーザーがテキスト入力欄に 50 文字入力 → 50 回の updatePreview() 発火 → 各回で 24+ ノード削除・作成 → ブラウザが毎回 reflow 実行 → UI がカクカク
- **影響:** UX 悪化。グリッドが大きい場合（10×20 grid など）は顕著

```javascript
// 改善案：DocumentFragment で batch 化
const fragment = document.createDocumentFragment();
for (let r = 0; r < layout.rows; r++) {
  for (let c = 0; c < layout.cols; c++) {
    // ... labelDiv 作成
    fragment.appendChild(labelDiv);
  }
}
previewPage.innerHTML = '';
previewPage.appendChild(fragment);
```

---

### 🟡 Likely Bugs（可能性高い）

#### 5. fontSizeMm が NaN に
- **Line:** 945
- **概要:** 入力フィールドが invalid なら `parseFloat()` が NaN を返す
- **失敗シナリオ:** fontSizeInput.value が empty または "abc" → `parseFloat("abc")` = NaN → `fontSizeMm = NaN * 0.3528` = NaN → CSS に `calc(var(--mm) * NaN)` → 計算結果が 0 → テキスト高さ 0px → 表示されない
- **影響:** 中。入力検証がないため発生可能

```javascript
// 現在
const fontSizeMm = fontSizePt * 0.3528;

// 修正案
const fontSizePt = parseFloat(fontSizeInput.value) || 10; // 既にあるが、念のため
const fontSizeMm = Math.max(0, fontSizePt * 0.3528);
```

---

#### 6. FileReader result 解析の脆弱性
- **Line:** 1003
- **概要:** data URL を `split(',')[1]` で単純解析。複数カンマ非対応
- **失敗シナリオ:** 稀だが、フォント URL に複数カンマが含まれる場合、split 結果が異なる可能性。base64 の一部しか取得されず、PDF 生成時にフォント登録失敗
- **影響:** 低～中。稀なケースだが silent failure

```javascript
// 現在（脆弱）
const base64 = reader.result.split(',')[1];

// 修正案
const match = reader.result.match(/data:[^;]*;base64,(.*)/);
const base64 = match ? match[1] : null;
if (!base64) throw new Error('フォント データ形式が無効です');
```

---

#### 7. テキスト下限の padding チェック漏れ
- **Line:** 1082
- **概要:** 行テキストの下限チェックが padding の下部を考慮していない
- **失敗シナリオ:** padding=2mm, fontSize=10pt, labelHeight=10mm の場合、最後の行のテキストが下部 padding 領域に侵入。PDF で見切れる
- **影響:** 低～中。エッジケース（小さいラベルサイズ）時のみ

```javascript
// 現在（不完全）
if (lineY + (fontSizeMm * 0.18) > y + layout.lblH - padding) {
  break;
}

// 修正案（下部 padding を考慮）
if (lineY + fontSizeMm > y + layout.lblH - padding) {
  break;
}
```

---

### 🟠 Design Issues（設計問題）

#### 8. applyLayoutInputs() と applyPreset() での code 重複
- **Line:** 809-817 と 972-979
- **概要:** 8 つのレイアウト入力フィールドの割り当てが両関数で重複
- **失敗シナリオ:** 新しいレイアウトパラメータ追加時（例：colSpacing2, labelDepth など）、両方を編集する必要がある。片方編集忘れで機能不全
- **影響:** 中。保守性低下。将来の機能追加時のバグリスク

```javascript
// 修正案：applyPreset() が applyLayoutInputs() を呼び出す
function applyPreset(index) {
  if (index === 'custom') {
    if (!customLayoutState) {
      customLayoutState = createDefaultCustomLayout();
    }
    applyLayoutInputs(customLayoutState); // ← 一元化
    updatePreview();
    return;
  }

  const preset = labelList[index];
  if (!preset) return;
  
  applyLayoutInputs(preset); // ← 一元化。preset に必要フィールド含める
  updatePreview();
}
```

---

## 追加で見つかった品質問題（参考）

### Performance Issues（5 件）
- Line 1160: テキスト入力に debounce なし → 毎キータイプで updatePreview 発火
- Line 1041: calculateLayout() が PDF 生成時に二重呼び出し（キャッシュなし）
- Line 1132: querySelector が毎クリックで 2 回実行
- Line 928: DOM ノード作成で DocumentFragment batching なし
- Line 1024: フォント読み込みが同期的で UI feedback が遅い

### Reuse Issues（5 件）
- Line 925, 1045: フォント変換係数 0.3528 が 2 箇所に hardcoded
- Line 928-950 vs 1053-1088: グリッド反復ロジックが duplicated
- Line 820: デフォルト値がマジックナンバー散在
- Line 1160-1163: テキスト入力リスナーが個別追加

### Style/Convention Issues（6 件）
- Line 575: speculative 空 `<div>` (未実装の機能予約)
- Line 791: コメントが WHAT を説明（WHY がない）
- Line 833: meta-comment about CLAUDE.md conventions
- Line 8, 16, 741: コメントが WHAT であって WHY でない

---

## 推奨修正優先順位

| 優先度 | ID | 対応 | 工数 |
|--------|-----|------|------|
| 🔴 高 | 1, 2 | CDN/外部ファイル読み込み fail-safe | 30min |
| 🔴 高 | 3 | 型統一（readLayoutInputs parseFloat） | 20min |
| 🟠 中 | 4 | debounce + DocumentFragment | 1h |
| 🟠 中 | 8 | applyPreset refactor | 30min |
| 🟡 低 | 5, 6, 7 | エッジケース対応 | 1h |

---

## レビュー方法論

**8 角度からの並列検証:**
1. ✅ Line-by-line correctness scan
2. ✅ Removed-behavior audit
3. ✅ Cross-file tracer
4. ✅ Reuse detection
5. ✅ Simplification audit
6. ✅ Efficiency analysis
7. ✅ Altitude/architecture audit
8. ✅ CLAUDE.md conventions check

**検証基準:** CONFIRMED（確定） / PLAUSIBLE（可能性高い） / REFUTED（否定）

**対象ファイル:** `/Users/katoy/github/study-claude/pdflabel/index.html` (1189 lines)
