#!/usr/bin/env node
/**
 * Demo Recording Integrator for todo-app2
 * グローバル設定を読み込んで、プロジェクト固有の実装に統合
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// グローバル設定パスを解決
const globalConfigPath = path.join(process.env.HOME, '.copilot', 'global-config', 'demo-recording.json');

if (!fs.existsSync(globalConfigPath)) {
  console.error('❌ Error: Global config not found at', globalConfigPath);
  process.exit(1);
}

// グローバル設定を読み込み
const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

// プロジェクト固有の設定
const projectConfig = {
  projectName: 'todo-app2',
  screenshotDir: path.join(__dirname, '..', 'screenshots'),
  ...globalConfig.screenRecording,
  ...globalConfig.projects['todo-app2'],
};

console.log('🎬 todo-app2 Demo Recording Integration');
console.log('================================================\n');

console.log('📝 Project Configuration:');
console.log(`  Project: ${projectConfig.projectName}`);
console.log(`  Screenshot Directory: ${projectConfig.screenshotDir}`);
console.log(`  Show Mouse Cursor: ${projectConfig.showMouseCursor}`);
console.log(`  Show Click Indicator: ${projectConfig.showClickIndicator}`);
console.log(`  Cursor Color: ${projectConfig.cursorColor}`);
console.log(`  Click Indicator Color: ${projectConfig.clickIndicatorColor}`);
console.log('');

console.log('📌 Recording Options:');
console.log(`  - Frame Rate: ${projectConfig.frameRate} fps`);
console.log(`  - Quality: ${projectConfig.quality}`);
console.log(`  - Output Format: ${projectConfig.format}`);
console.log('');

// スクリーンショットディレクトリが存在するか確認
if (!fs.existsSync(projectConfig.screenshotDir)) {
  fs.mkdirSync(projectConfig.screenshotDir, { recursive: true });
  console.log(`✅ Created screenshot directory: ${projectConfig.screenshotDir}`);
}

console.log('\n✅ Configuration loaded successfully!');
console.log('   Ready to generate demo GIFs with mouse visualization.');
console.log('');
console.log('📍 Global Config Path:');
console.log(`   ${globalConfigPath}`);

export default projectConfig;

