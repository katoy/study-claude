const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../index.html');
const jsOutputPath = path.join(__dirname, '../index.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// <script>タグの中身を取り出す
// index.htmlの最後の <script> タグをマッチさせる
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptContent = '';

// すべて of script タグを探すが、一番大きい（最後の）ものを採用する
while ((match = scriptRegex.exec(htmlContent)) !== null) {
  if (match[1].length > scriptContent.length) {
    scriptContent = match[1];
  }
}

if (!scriptContent) {
  console.error('Script content not found in index.html');
  process.exit(1);
}

// テスト時に window スコープから呼び出せるように公開する (カバレッジ低下を防ぐため、if文を排除)
const windowExports = `
// Test exports
window.initializePresets = initializePresets;
window.calculateLayout = calculateLayout;
window.updatePreview = updatePreview;
window.applyPreset = applyPreset;
window.fetchNotoSansJPFont = fetchNotoSansJPFont;
window.generateAndOpenPDF = generateAndOpenPDF;
`;

// テスト用のJSファイルとして書き出し (Node require環境のため、ポリフィルブリッジは一切不要)
fs.writeFileSync(jsOutputPath, scriptContent + windowExports, 'utf-8');
console.log('Successfully extracted script to index.js');
