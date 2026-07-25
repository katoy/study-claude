---
name: browser-tests
description: |
  PlaywrightとFFmpegを使用したブラウザベースのE2Eテストの実行、
  静的UIスクリーンショットの生成、およびマウスカーソル位置・クリックの可視化を
  伴うインタラクティブな操作デモGIFの作成に関するガイドラインとテンプレート。
license: Apache-2.0
metadata:
  version: v2
  publisher: local
---

# ブラウザデモGIF生成（マウス・クリック可視化）とテスト

このスキルは、**Playwright (Node.js)** と **FFmpeg** を使用して、ブラウザ操作のデモを撮影し、**マウスカーソルの位置とクリック（波紋エフェクト）を可視化した高品質なGIFアニメーション**を生成するための汎用的な手順と再利用可能なテンプレートコードを提供します。

## なぜこのスキルが必要か？

Playwrightの標準機能でブラウザ操作を動画録画（`recordVideo`）した場合、システムのマウスカーソルは録画されません。そのため、生成された動画やGIFでは「どこを操作しているか」「いつクリックしたか」がユーザーに伝わりづらくなります。

このスキルは、ブラウザ内に**仮想のマウスカーソルとクリック波紋エフェクトをインジェクション**し、Playwrightのマウス移動イベントを制御することで、直感的でわかりやすい操作デモGIFを作成する手法を定式化したものです。

---

## 3つのコアテクノロジー

### 1. 仮想カーソル＆クリック波紋のインジェクション
Playwrightの `page.addInitScript`を利用して、ブラウザ内のDOM構造に仮想のカーソル要素（`div`）を挿入します。
マウスの動き、ボタンの押し下げ（クリック）、およびクリック時の拡張波紋エフェクト（Ripple Effect）をCSSアニメーションで表現します。
また、`<dialog>`（モーダル）などの最前面レイヤー（Top Layer）が表示された際にもカーソルが裏に隠れないよう、親要素を動的に追跡して再配置します。

### 2. 滑らかなマウス移動（スムーズスクロール）
通常、Playwrightの `page.click()` などのAPIは、カーソルを瞬間移動させて操作します。
デモ動画として自然に見せるため、要素のバウンディングボックスの中心座標を計算し、`page.mouse.move(x, y, { steps: 30 })` のように複数ステップに分割してカーソルを移動させます。また、操作の合間に適切な待機時間（`page.waitForTimeout`）を挿入します。

### 3. WebMから高品質・軽量なGIFへの変換
Playwrightが録画した `.webm` 形式の動画を、FFmpeg を用いてGIFに変換します。
単に変換するのではなく、FFmpegのパレット生成機能（`palettegen`）を使用して動画固有の最適化カラーパレットを作成し、それを利用してGIFを出力する（`paletteuse`）ことで、ノイズが少なく高画質なGIFを非常に小さなファイルサイズで生成します。

---

## 再利用可能な実装テンプレート (`record-demo.js`)

プロジェクトに `scripts/record-demo.js` として配置してカスタマイズできる標準的な Node.js (ES Module) テンプレートです。

```javascript
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * 仮想カーソルとクリック波紋エフェクトをブラウザにインジェクションする
 */
async function injectCursor(page) {
  // ブラウザ側のコンソールログをターミナルに出力する（デバッグ用）
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  await page.addInitScript(() => {
    let cursor = null;

    // ダイアログなどのTop Layerにカーソルが遮られないよう親要素を選択
    function getCursorParent() {
      const openDialog = document.querySelector('dialog[open]');
      return openDialog || document.body || document.documentElement;
    }

    function createCursor() {
      const parent = getCursorParent();
      cursor = document.getElementById('playwright-fake-cursor');

      if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'playwright-fake-cursor';
        Object.assign(cursor.style, {
          position: 'fixed',
          width: '18px',
          height: '18px',
          background: 'rgba(255, 50, 50, 0.9)', // カーソルの色（赤など）
          border: '2px solid white',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: '999999',
          transform: 'translate(-50%, -50%)',
          left: '-100px',
          top: '-100px',
          boxShadow: '0 0 6px rgba(0,0,0,0.5)',
          transition: 'background-color 0.1s, transform 0.1s'
        });
        parent.appendChild(cursor);
      } else if (cursor.parentNode !== parent) {
        parent.appendChild(cursor); // 親が変わったら移動
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createCursor);
    } else {
      createCursor();
    }

    // マウス移動に追従
    window.addEventListener('mousemove', (e) => {
      createCursor();
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    }, true);

    // マウスクリック（押し下げ）時の縮小アニメーション
    window.addEventListener('mousedown', () => {
      createCursor();
      if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
        cursor.style.backgroundColor = 'rgba(255, 0, 0, 1)';
      }
    }, true);

    window.addEventListener('mouseup', () => {
      createCursor();
      if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
      }
    }, true);

    // クリック時の波紋エフェクト (Ripple)
    window.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      Object.assign(ripple.style, {
        position: 'fixed',
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 50, 50, 0.7)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: '999998',
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        transform: 'translate(-50%, -50%) scale(0.1)',
        opacity: '1',
        transition: 'transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.4s ease-out'
      });
      
      const parent = getCursorParent();
      parent.appendChild(ripple);

      setTimeout(() => {
        ripple.style.transform = 'translate(-50%, -50%) scale(1)';
        ripple.style.opacity = '0';
      }, 10);

      setTimeout(() => ripple.remove(), 500);
    }, true);
  });
}

/**
 * マウスを滑らかに対象要素へ移動させてからクリックする
 */
async function smoothClick(page, selector) {
  const element = await page.waitForSelector(selector);
  const box = await element.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    // steps数を増やすことで移動スピードを遅く、滑らかに見せる（デモ用に最適）
    await page.mouse.move(x, y, { steps: 30 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(300);
  } else {
    await page.click(selector);
  }
}

/**
 * マウスを滑らかに対象入力欄へ移動させてフォーカスし、文字を入力する
 */
async function smoothFill(page, selector, text) {
  const element = await page.waitForSelector(selector);
  const box = await element.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps: 30 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    await element.fill(text);
    await page.waitForTimeout(300);
  } else {
    await page.fill(selector, text);
  }
}

async function main() {
  console.log('🎥 Starting Demo Recording...');
  const videoDir = path.join(rootDir, 'temp_video');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
  }

  // 録画のために headless: false (通常表示モード) を推奨。
  // headless モードの場合、一部のアニメーションやレンダリングタイミングが異なる場合があります。
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
  } catch (e) {
    console.log('⚠️ Failed to launch in headful mode, falling back to headless: true');
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1024, height: 768 }
    }
  });

  const page = await context.newPage();
  await injectCursor(page);

  // --- デモのシナリオ操作開始 ---
  const targetUrl = 'http://localhost:5173'; // 対象アプリのURL
  await page.goto(targetUrl);
  await page.waitForTimeout(1000);
  
  // 初期位置にマウスを移動
  await page.mouse.move(512, 384);
  await page.waitForTimeout(500);

  // 例: ボタンをクリック
  await smoothClick(page, '#submit-button');
  
  // 例: 入力欄にテキスト入力
  await smoothFill(page, '#input-name', 'テスト太郎');

  // 必要に応じて待機
  await page.waitForTimeout(1500);
  // --- デモのシナリオ操作終了 ---

  await context.close();
  await browser.close();

  // 録画されたWebMファイルの特定
  const files = fs.readdirSync(videoDir);
  const webmFile = files.find(f => f.endsWith('.webm'));
  if (!webmFile) {
    throw new Error('No video file recorded.');
  }

  const webmPath = path.join(videoDir, webmFile);
  const gifPath = path.join(rootDir, 'screenshots', 'demo.gif');
  const screenshotsDir = path.dirname(gifPath);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // FFmpeg による高品質GIFへの最適化コンパイル
  console.log('🎬 Converting video to high-quality GIF...');
  const ffmpegCmd = `ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`;
  execSync(ffmpegCmd);

  // 一時ビデオファイルの削除
  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log(`🎉 Demo GIF created successfully: ${gifPath}`);
}

main().catch(err => {
  console.error('❌ Error recording demo:', err);
  process.exit(1);
});
```

---

## 高品質GIF変換のためのFFmpegコマンド解説

```bash
ffmpeg -y -i input.webm -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 output.gif
```

- `-vf`: ビデオフィルタを適用します。
  - `fps=10`: GIFのフレームレートを 10fps に設定（ファイルサイズと滑らかさの最適なバランス）。
  - `scale=800:-1`: アスペクト比を維持しながら横幅を800ピクセルに縮小。
  - `flags=lanczos`: 高品質なリサイズアルゴリズム（Lanczos）を指定。
  - `split[s0][s1]`: 入力ストリームを2つ（`s0`, `s1`）に分岐させます。
  - `[s0]palettegen[p]`: 分岐1（`s0`）からその動画に最適な256色のカラーパレット（`p`）を生成します。これによりGIFのノイズやマッハバンドを劇的に削減します。
  - `[s1][p]paletteuse`: 分岐2（`s1`）に生成したカラーパレット（`p`）を適用して、高品質なGIFを出力します。
- `-loop 0`: アニメーションを無限ループさせる設定です。
