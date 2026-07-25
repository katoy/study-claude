#!/usr/bin/env node
/**
 * Demo GIF Generator for todo-app2
 * Playwright でスクリーンショットを取得 → sharp で処理 → FFmpeg で GIF化
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { execSync } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const tempDir = path.join(os.tmpdir(), 'demo-gif-' + Date.now());

// グローバル設定を読み込み
const configPath = path.join(process.env.HOME, '.copilot', 'global-config', 'demo-recording.json');
const globalConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const recordingConfig = globalConfig.screenRecording;

// ビルド済み HTML のパス
const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const outputGif = path.join(screenshotsDir, 'demo.gif');

console.log('🎬 Demo GIF Generator for todo-app2');
console.log('================================================\n');

console.log('📋 Configuration:');
console.log(`  - Show Mouse Cursor: ${recordingConfig.showMouseCursor}`);
console.log(`  - Show Click Indicator: ${recordingConfig.showClickIndicator}`);
console.log(`  - Cursor Color: ${recordingConfig.cursorColor}`);
console.log(`  - Frame Rate: ${recordingConfig.frameRate} fps`);
console.log('');

// 16進数カラーを RGB に変換
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 0, b: 0 };
}

// SVG で描画してPNG化（マウスカーソルを追加）
async function addCursorAndClick(screenshotBuffer, cursorX, cursorY, showClick = false) {
  const rgb = hexToRgb(recordingConfig.cursorColor);
  const rgbStr = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

  // SVG レイヤーを構築
  let svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">`;

  // クリック効果（リップル）
  if (showClick) {
    svg += `<circle cx="${cursorX}" cy="${cursorY}" r="30" fill="none" stroke="${rgbStr}" stroke-width="2" opacity="0.6"/>`;
  }

  // マウスカーソル（十字）
  svg += `<line x1="${cursorX}" y1="${cursorY - 12}" x2="${cursorX}" y2="${cursorY + 12}" stroke="${rgbStr}" stroke-width="2" stroke-linecap="round"/>`;
  svg += `<line x1="${cursorX - 12}" y1="${cursorY}" x2="${cursorX + 12}" y2="${cursorY}" stroke="${rgbStr}" stroke-width="2" stroke-linecap="round"/>`;

  svg += `</svg>`;

  // PNG にオーバーレイ
  const svgBuffer = Buffer.from(svg);
  return sharp(screenshotBuffer)
    .composite([{ input: svgBuffer, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function generateDemoGif() {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 一時ディレクトリ作成
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  console.log('🚀 Launching browser and capturing demo sequence...\n');

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    // ビューポート設定
    await page.setViewportSize({ width: 1280, height: 720 });

    // ローカルHTMLを開く
    const fileUrl = `file://${htmlPath}`;
    console.log(`📄 Loading: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const frames = [];
    let frameCount = 0;

    // フレーム1: 初期状態
    console.log('📸 Capturing frame 1: Initial state...');
    let screenshot = await page.screenshot({ fullPage: false });
    let processed = await addCursorAndClick(screenshot, 320, 100, false);
    const frame1 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
    await fs.promises.writeFile(frame1, processed);
    frames.push(frame1);
    frameCount++;

    // フレーム2: ボタン方向へマウス移動
    console.log('📸 Capturing frame 2: Moving to button...');
    processed = await addCursorAndClick(screenshot, 600, 120, false);
    const frame2 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
    await fs.promises.writeFile(frame2, processed);
    frames.push(frame2);
    frameCount++;

    // 「新規タスク作成」ボタンをクリック
    const addButton = page.locator('button:has-text("新規タスク作成")');
    if (await addButton.isVisible()) {
      const box = await addButton.boundingBox();
      if (box) {
        // フレーム3: ボタンホバー + クリック
        console.log('📸 Capturing frame 3: Button hover with click...');
        screenshot = await page.screenshot({ fullPage: false });
        const btnX = Math.round(box.x + box.width / 2);
        const btnY = Math.round(box.y + box.height / 2);
        processed = await addCursorAndClick(screenshot, btnX, btnY, true);
        const frame3 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
        await fs.promises.writeFile(frame3, processed);
        frames.push(frame3);
        frameCount++;

        await addButton.click();
        await page.waitForTimeout(600);
      }
    }

    // フレーム4: フォーム表示
    console.log('📸 Capturing frame 4: Form visible...');
    screenshot = await page.screenshot({ fullPage: false });
    processed = await addCursorAndClick(screenshot, 640, 300, false);
    const frame4 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
    await fs.promises.writeFile(frame4, processed);
    frames.push(frame4);
    frameCount++;

    // テキスト入力
    const titleInput = page.locator('input[placeholder*="タスク"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.click();
      await titleInput.fill('デモ: 新しいタスク');
      await page.waitForTimeout(500);

      // フレーム5: テキスト入力後
      console.log('📸 Capturing frame 5: Text entered...');
      screenshot = await page.screenshot({ fullPage: false });
      processed = await addCursorAndClick(screenshot, 640, 300, false);
      const frame5 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
      await fs.promises.writeFile(frame5, processed);
      frames.push(frame5);
      frameCount++;
    }

    // 保存ボタンクリック
    const saveButton = page.locator('button:has-text("保存")').first();
    if (await saveButton.isVisible()) {
      const saveBox = await saveButton.boundingBox();
      if (saveBox) {
        // フレーム6: 保存ボタンホバー
        console.log('📸 Capturing frame 6: Save button with click...');
        screenshot = await page.screenshot({ fullPage: false });
        const saveBtnX = Math.round(saveBox.x + saveBox.width / 2);
        const saveBtnY = Math.round(saveBox.y + saveBox.height / 2);
        processed = await addCursorAndClick(screenshot, saveBtnX, saveBtnY, true);
        const frame6 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
        await fs.promises.writeFile(frame6, processed);
        frames.push(frame6);
        frameCount++;

        await saveButton.click();
        await page.waitForTimeout(800);
      }
    }

    // フレーム7: 完了状態
    console.log('📸 Capturing frame 7: Final state...');
    screenshot = await page.screenshot({ fullPage: false });
    processed = await addCursorAndClick(screenshot, 640, 400, false);
    const frame7 = path.join(tempDir, `frame-${String(frameCount).padStart(3, '0')}.png`);
    await fs.promises.writeFile(frame7, processed);
    frames.push(frame7);
    frameCount++;

    console.log(`\n✨ Captured ${frameCount} frames\n`);

    // FFmpeg で GIF に変換
    console.log('🎞️  Converting to GIF using FFmpeg...');
    const framePattern = path.join(tempDir, 'frame-%03d.png');
    const ffmpegCmd = `ffmpeg -framerate ${recordingConfig.frameRate} -i "${framePattern}" -vf "scale=1280:-1" -loop 0 "${outputGif}" 2>&1`;
    
    try {
      execSync(ffmpegCmd, { stdio: 'pipe' });
    } catch (e) {
      console.error('FFmpeg error:', e.message);
      throw e;
    }

    const fileSize = fs.statSync(outputGif).size;
    console.log(`\n✅ Demo GIF created successfully!`);
    console.log(`📍 Output: ${outputGif}`);
    console.log(`📊 Size: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`🎬 Frames: ${frameCount}`);
    console.log(`📈 Frame rate: ${recordingConfig.frameRate} fps`);
    console.log('\n🖱️  マウスカーソル（赤い十字）とクリック位置（赤いリップル）が可視化されています。');

    await browser.close();

    // 一時ファイル削除
    fs.rmSync(tempDir, { recursive: true, force: true });

  } catch (error) {
    console.error('❌ Error generating demo GIF:', error.message);
    if (browser) await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }
}

generateDemoGif();
