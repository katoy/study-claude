#!/usr/bin/env node
/**
 * Demo GIF Generator for todo-app2
 * Playwright でスクリーンショット取得 → sharp で処理 → FFmpeg で GIF化
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

// フレームを保存するヘルパー関数
async function saveFrame(screenshot, cursorX, cursorY, showClick, frameNum) {
  const processed = await addCursorAndClick(screenshot, cursorX, cursorY, showClick);
  const frameFile = path.join(tempDir, `frame-${String(frameNum).padStart(3, '0')}.png`);
  await fs.promises.writeFile(frameFile, processed);
  return frameFile;
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
    let frameNum = 0;

    // ===== シーン1: 初期状態 =====
    console.log('📸 Scene 1: Initial state...');
    let screenshot = await page.screenshot({ fullPage: false });
    
    // 3フレーム（初期位置）
    for (let i = 0; i < 3; i++) {
      let frame = await saveFrame(screenshot, 100, 100, false, frameNum);
      frames.push(frame);
      frameNum++;
    }

    // ===== シーン2: マウス移動アニメーション =====
    console.log('📸 Scene 2: Mouse moving to button...');
    
    // マウスカーソルを左から右へ移動（5フレーム）
    for (let i = 0; i <= 4; i++) {
      const cursorX = 100 + (500 * i / 4); // 100 → 600
      let frame = await saveFrame(screenshot, cursorX, 100, false, frameNum);
      frames.push(frame);
      frameNum++;
    }

    // ===== シーン3: ボタンクリック =====
    console.log('📸 Scene 3: Clicking button...');
    
    // ボタン上でクリック効果（3フレーム）
    for (let i = 0; i < 3; i++) {
      let frame = await saveFrame(screenshot, 600, 100, true, frameNum);
      frames.push(frame);
      frameNum++;
    }

    // ボタンをクリック
    const addButton = page.locator('button:has-text("新規タスク作成")');
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await addButton.boundingBox();
      if (box) {
        await addButton.click();
        console.log('  ✓ Button clicked');
      }
    }

    await page.waitForTimeout(800);

    // ===== シーン4: フォーム表示後 =====
    console.log('📸 Scene 4: Form displayed...');
    screenshot = await page.screenshot({ fullPage: false });
    
    // フォーム表示状態（2フレーム）
    for (let i = 0; i < 2; i++) {
      let frame = await saveFrame(screenshot, 300, 300, false, frameNum);
      frames.push(frame);
      frameNum++;
    }

    // ===== シーン5: テキスト入力 =====
    console.log('📸 Scene 5: Text input...');
    
    const titleInput = page.locator('input[placeholder*="タスク"], input[type="text"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const inputBox = await titleInput.boundingBox();
      if (inputBox) {
        const inputX = Math.round(inputBox.x + inputBox.width / 2);
        const inputY = Math.round(inputBox.y + inputBox.height / 2);

        // クリック効果（2フレーム）
        screenshot = await page.screenshot({ fullPage: false });
        for (let i = 0; i < 2; i++) {
          let frame = await saveFrame(screenshot, inputX, inputY, true, frameNum);
          frames.push(frame);
          frameNum++;
        }

        // テキスト入力
        await titleInput.click();
        await titleInput.fill('新しいタスク');
        console.log('  ✓ Text entered');
        
        await page.waitForTimeout(600);
        screenshot = await page.screenshot({ fullPage: false });
        
        // 入力完了状態（2フレーム）
        for (let i = 0; i < 2; i++) {
          let frame = await saveFrame(screenshot, inputX, inputY, false, frameNum);
          frames.push(frame);
          frameNum++;
        }
      }
    }

    // ===== シーン6: 保存ボタンクリック =====
    console.log('📸 Scene 6: Save button...');
    
    const saveButton = page.locator('button:has-text("保存")').first();
    if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const saveBox = await saveButton.boundingBox();
      if (saveBox) {
        const saveBtnX = Math.round(saveBox.x + saveBox.width / 2);
        const saveBtnY = Math.round(saveBox.y + saveBox.height / 2);

        screenshot = await page.screenshot({ fullPage: false });
        
        // クリック効果（3フレーム）
        for (let i = 0; i < 3; i++) {
          let frame = await saveFrame(screenshot, saveBtnX, saveBtnY, true, frameNum);
          frames.push(frame);
          frameNum++;
        }

        await saveButton.click();
        console.log('  ✓ Save button clicked');
        
        await page.waitForTimeout(1000);
      }
    }

    // ===== シーン7: 完了状態 =====
    console.log('📸 Scene 7: Final state...');
    screenshot = await page.screenshot({ fullPage: false });
    
    // 完了状態（3フレーム）
    for (let i = 0; i < 3; i++) {
      let frame = await saveFrame(screenshot, 400, 400, false, frameNum);
      frames.push(frame);
      frameNum++;
    }

    console.log(`\n✨ Total frames captured: ${frameNum}\n`);

    // FFmpeg で GIF に変換
    console.log('🎞️  Converting to GIF using FFmpeg...');
    const framePattern = path.join(tempDir, 'frame-%03d.png');
    
    // FFmpeg コマンド：より良いアニメーション用パラメータ
    const ffmpegCmd = `ffmpeg -framerate ${recordingConfig.frameRate} -i "${framePattern}" -vf "fps=${recordingConfig.frameRate},scale=1280:-1:flags=lanczos" -loop 0 -y "${outputGif}" 2>&1`;
    
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
    console.log(`🎬 Frames: ${frameNum}`);
    console.log(`📈 Frame rate: ${recordingConfig.frameRate} fps`);
    console.log('⏱️  Duration: ~' + ((frameNum / recordingConfig.frameRate).toFixed(1)) + 's');
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
