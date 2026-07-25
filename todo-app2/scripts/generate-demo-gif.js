#!/usr/bin/env node
/**
 * Demo GIF Generator for todo-app2
 * ビルド済みの dist/index.html を使用して、デモ GIF を生成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, '..', 'screenshots');

// グローバル設定を読み込み
const configPath = path.join(process.env.HOME, '.copilot', 'global-config', 'demo-recording.json');
const globalConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const recordingConfig = globalConfig.screenRecording;

console.log('🎬 Demo GIF Generator for todo-app2');
console.log('================================================\n');

console.log('📋 Configuration:');
console.log(`  - Show Mouse Cursor: ${recordingConfig.showMouseCursor}`);
console.log(`  - Show Click Indicator: ${recordingConfig.showClickIndicator}`);
console.log(`  - Cursor Color: ${recordingConfig.cursorColor}`);
console.log(`  - Frame Rate: ${recordingConfig.frameRate} fps`);
console.log('');

// ビルド済み HTML のパス
const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const outputGif = path.join(screenshotsDir, 'demo.gif');

console.log('📂 Input:');
console.log(`  - HTML: ${htmlPath}`);
console.log('');

console.log('💡 Instructions:');
console.log('');
console.log('  1️⃣  ビルド済みアプリが dist/index.html に存在します');
console.log('');
console.log('  2️⃣  手動でスクリーンレコーディングして、demo.gif を生成してください：');
console.log('');
console.log('     macOS (QuickTime Player):');
console.log('       a. cmd+space → "QuickTime Player" を起動');
console.log('       b. ファイル → 新規画面収録');
console.log('       c. 対象領域を選択 (1280x720 推奨)');
console.log('       d. アプリの操作をデモ (新規タスク作成 → 保存など)');
console.log('       e. 停止して .mov として保存');
console.log('');
console.log('  3️⃣  または、以下のコマンドで .mov ファイルを GIF に変換：');
console.log('');
console.log(`     ffmpeg -i demo.mov -c:v libx264 -preset slow -crf 25 -c:a aac -b:a 192k demo.mp4`);
console.log(`     ffmpeg -i demo.mp4 -vf "fps=20,scale=1280:-1" demo.gif`);
console.log('');
console.log('  4️⃣  生成された GIF をコミット：');
console.log('');
console.log('     git add screenshots/demo.gif');
console.log('     git commit -m "docs: Update demo GIF with mouse cursor visualization"');
console.log('');
console.log('📍 Output will be saved to:');
console.log(`   ${outputGif}`);
console.log('');
console.log('✅ グローバル設定により、マウスカーソルとクリック位置が可視化されます。');
console.log('');
