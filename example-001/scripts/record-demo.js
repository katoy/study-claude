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
  await page.addInitScript(() => {
    let cursor = null;

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
          background: 'rgba(0, 240, 240, 0.9)', // カーソルの色（ゲームのネオンカラーに合わせてシアン）
          border: '2px solid white',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: '999999',
          transform: 'translate(-50%, -50%)',
          left: '-100px',
          top: '-100px',
          boxShadow: '0 0 8px rgba(0, 240, 240, 0.8)',
          transition: 'background-color 0.1s, transform 0.1s'
        });
        parent.appendChild(cursor);
      } else if (cursor.parentNode !== parent) {
        parent.appendChild(cursor);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createCursor);
    } else {
      createCursor();
    }

    window.addEventListener('mousemove', (e) => {
      createCursor();
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    }, true);

    window.addEventListener('mousedown', () => {
      createCursor();
      if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
        cursor.style.backgroundColor = 'rgba(0, 180, 240, 1)';
      }
    }, true);

    window.addEventListener('mouseup', () => {
      createCursor();
      if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.backgroundColor = 'rgba(0, 240, 240, 0.9)';
      }
    }, true);

    window.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      Object.assign(ripple.style, {
        position: 'fixed',
        width: '45px',
        height: '45px',
        border: '3px solid rgba(0, 240, 240, 0.8)',
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
    await page.mouse.move(x, y, { steps: 25 });
    await page.waitForTimeout(150);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(300);
  } else {
    await page.click(selector);
  }
}

async function main() {
  console.log('🎥 Starting Demo Recording...');
  const videoDir = path.join(rootDir, 'temp_video');
  const screenshotsDir = path.join(rootDir, 'screenshots');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
  }
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 録画のために headless: false (通常表示モード) を推奨。
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
  } catch (e) {
    console.log('⚠️ Failed to launch in headful mode, falling back to headless: true');
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 880, height: 750 },
    recordVideo: {
      dir: videoDir,
      size: { width: 880, height: 750 }
    }
  });

  const page = await context.newPage();
  await injectCursor(page);

  const gamePath = path.join(rootDir, 'game/index.html');
  const gameURL = `file://${gamePath}`;
  await page.goto(gameURL);
  await page.waitForTimeout(1000);
  
  // 初期位置にマウスを移動
  await page.mouse.move(440, 375);
  await page.waitForTimeout(500);

  // 1. 静的スクリーンショットの取得
  console.log('📸 Saving static gameplay screenshot...');
  const screenshotPath = path.join(screenshotsDir, 'main_gameplay.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  // 2. デモのシナリオ操作開始
  console.log('🎮 Playing the game for recording...');

  // キー入力操作
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowUp'); // 回転
  await page.waitForTimeout(200);
  await page.keyboard.press(' '); // ハードドロップ
  await page.waitForTimeout(800);

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press(' '); // ハードドロップ
  await page.waitForTimeout(800);

  // タッチ操作ボタンのクリックをデモ
  await smoothClick(page, '#btnLeft');
  await smoothClick(page, '#btnRotate');
  await smoothClick(page, '#btnRight');
  await smoothClick(page, '#btnHardDrop');
  await page.waitForTimeout(800);

  // 一時停止デモ
  await smoothClick(page, '#btnPause');
  await page.waitForTimeout(1200);
  await smoothClick(page, '#btnPause'); // 再開
  await page.waitForTimeout(600);

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
  const gifPath = path.join(screenshotsDir, 'demo.gif');

  // FFmpeg による高品質GIFへの最適化コンパイル
  console.log('🎬 Converting video to high-quality GIF...');
  const ffmpegCmd = `ffmpeg -y -i "${webmPath}" -vf "fps=12,scale=680:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`;
  execSync(ffmpegCmd);

  // 一時ビデオファイルの削除
  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log(`🎉 Demo GIF created successfully: ${gifPath}`);
}

main().catch(err => {
  console.error('❌ Error recording demo:', err);
  process.exit(1);
});
