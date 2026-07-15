import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const gameDir = path.join(process.cwd(), 'game');
const htmlPath = path.join(gameDir, 'index.html');
const backupPath = path.join(gameDir, 'index.original.html');
const jsPath = path.join(gameDir, 'game.js');
const testsDir = path.join(process.cwd(), 'tests');
const coverageFixturePath = path.join(testsDir, 'coverage.js');
const nycOutputDir = path.join(process.cwd(), '.nyc_output');
const coverageReportDir = path.join(process.cwd(), 'coverage');

// Playwright で Chromium の V8 カバレッジを収集するための fixture
const fixtureContent = `import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import v8toIstanbul from 'v8-to-istanbul';

const COVERAGE_DIR = path.join(process.cwd(), '.nyc_output');

export const test = base.extend({
  page: async ({ page }, use) => {
    const isChromium = page.context().browser().browserType().name() === 'chromium';
    if (isChromium) {
      await page.coverage.startJSCoverage({
        includeRawScriptSource: true,
        resetOnNavigation: false
      });
    }

    await use(page);

    if (isChromium) {
      const coverage = await page.coverage.stopJSCoverage();
      const gameJsCoverage = coverage.find(entry => entry.url.endsWith('game/game.js') || entry.url.includes('game.js'));
      
      if (gameJsCoverage) {
        const jsFilePath = path.join(process.cwd(), 'game/game.js');
        const converter = v8toIstanbul(jsFilePath, 0, {
          source: gameJsCoverage.source
        });
        await converter.load();
        converter.applyCoverage(gameJsCoverage.functions);
        
        const istanbulCoverage = converter.toIstanbul();

        if (!fs.existsSync(COVERAGE_DIR)) {
          fs.mkdirSync(COVERAGE_DIR, { recursive: true });
        }

        const id = crypto.randomBytes(16).toString('hex');
        fs.writeFileSync(
          path.join(COVERAGE_DIR, \`coverage-\${id}.json\`),
          JSON.stringify(istanbulCoverage)
        );
      }
    }
  }
});

export const expect = base.expect;
`;

function generateReport() {
  const map = libCoverage.createCoverageMap();
  if (!fs.existsSync(nycOutputDir)) {
    console.log('No coverage data found.');
    return;
  }
  const files = fs.readdirSync(nycOutputDir);
  let count = 0;
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(nycOutputDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      map.merge(content);
      count++;
    }
  }
  console.log(`Merged ${count} coverage files.`);

  const context = libReport.createContext({
    dir: coverageReportDir,
    defaultSummarizer: 'nested',
    watermarks: {
      statements: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      lines: [50, 80]
    },
    coverageMap: map
  });

  reports.create('html').execute(context);
  reports.create('text-summary').execute(context);
}

let isSplit = false;
let modifiedSpecs = [];

try {
  console.log('1. Splitting HTML and JS...');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const scriptStartTag = '    <script>';
  const scriptEndTag = '    </script>';
  const startIndex = htmlContent.indexOf(scriptStartTag);
  const endIndex = htmlContent.indexOf(scriptEndTag);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not find script tags in index.html');
  }
  const jsContent = htmlContent.substring(startIndex + scriptStartTag.length, endIndex);
  const newHtmlContent = htmlContent.substring(0, startIndex) +
    '    <script src="game.js"></script>' +
    htmlContent.substring(endIndex + scriptEndTag.length);

  fs.writeFileSync(backupPath, htmlContent, 'utf8');
  fs.writeFileSync(jsPath, jsContent, 'utf8');
  fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');
  isSplit = true;

  console.log('2. Writing coverage fixture...');
  fs.writeFileSync(coverageFixturePath, fixtureContent, 'utf8');

  console.log('3. Modifying test imports...');
  const specFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.js'));
  for (const spec of specFiles) {
    const specPath = path.join(testsDir, spec);
    let content = fs.readFileSync(specPath, 'utf8');
    if (content.includes("from '@playwright/test'")) {
      content = content.replace("from '@playwright/test'", "from './coverage.js'");
      fs.writeFileSync(specPath, content, 'utf8');
      modifiedSpecs.push(specPath);
    }
  }

  console.log('4. Running tests...');
  if (fs.existsSync(nycOutputDir)) {
    fs.rmSync(nycOutputDir, { recursive: true, force: true });
  }
  
  try {
    execSync('npx playwright test', { stdio: 'inherit' });
  } catch (err) {
    console.warn('Some tests failed, but proceeding to generate coverage and restore files.');
  }

  console.log('5. Generating report...');
  generateReport();
  console.log(`\nCoverage report generated at: ${path.join(coverageReportDir, 'index.html')}`);

} catch (error) {
  console.error('An error occurred during coverage measurement:', error);
} finally {
  console.log('6. Restoring files and cleaning up...');
  
  // テストファイルのインポートを復元
  for (const specPath of modifiedSpecs) {
    if (fs.existsSync(specPath)) {
      let content = fs.readFileSync(specPath, 'utf8');
      content = content.replace("from './coverage.js'", "from '@playwright/test'");
      fs.writeFileSync(specPath, content, 'utf8');
    }
  }

  // fixture の削除
  if (fs.existsSync(coverageFixturePath)) {
    fs.unlinkSync(coverageFixturePath);
  }

  // HTML/JS のマージ
  if (isSplit && fs.existsSync(backupPath) && fs.existsSync(jsPath)) {
    const originalHtmlContent = fs.readFileSync(backupPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    const scriptStartTag = '    <script>';
    const startIndex = originalHtmlContent.indexOf(scriptStartTag);
    const endIndex = originalHtmlContent.indexOf('    </script>');
    if (startIndex !== -1 && endIndex !== -1) {
      const mergedHtmlContent = originalHtmlContent.substring(0, startIndex + scriptStartTag.length) +
        jsContent +
        originalHtmlContent.substring(endIndex);
      fs.writeFileSync(htmlPath, mergedHtmlContent, 'utf8');
    }
    fs.unlinkSync(jsPath);
    fs.unlinkSync(backupPath);
  }

  // .nyc_output の削除
  if (fs.existsSync(nycOutputDir)) {
    fs.rmSync(nycOutputDir, { recursive: true, force: true });
  }
  console.log('Cleanup completed successfully.');
}
