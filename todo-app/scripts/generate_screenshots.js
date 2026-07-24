const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8123';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const TEMP_FRAME_DIR = path.join(__dirname, '..', 'temp_frames');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function clearDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function injectCustomPointer(page) {
  return page.evaluate(() => {
    if (!document.getElementById('custom-mouse-style')) {
      const style = document.createElement('style');
      style.id = 'custom-mouse-style';
      style.innerHTML = `
        #custom-mouse-pointer {
          position: fixed;
          top: -100px;
          left: -100px;
          width: 22px;
          height: 22px;
          background: rgba(239, 68, 68, 0.9);
          border: 2px solid #ffffff;
          border-radius: 50%;
          pointer-events: none;
          z-index: 999999;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        .custom-ripple {
          position: fixed;
          width: 40px;
          height: 40px;
          border: 3px solid rgba(239, 68, 68, 0.9);
          border-radius: 50%;
          pointer-events: none;
          z-index: 999998;
          transform: translate(-50%, -50%) scale(0.2);
          opacity: 1;
          animation: custom-ripple-anim 0.35s ease-out forwards;
        }
        @keyframes custom-ripple-anim {
          to {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
      const pointer = document.createElement('div');
      pointer.id = 'custom-mouse-pointer';
      document.body.appendChild(pointer);
    }
  });
}

class AnimationRecorder {
  constructor(page, framesDir) {
    this.page = page;
    this.framesDir = framesDir;
    this.frameCount = 0;
    this.currentPos = { x: 400, y: 300 };
    clearDir(this.framesDir);
  }

  async captureFrame(repeat = 1) {
    for (let i = 0; i < repeat; i++) {
      this.frameCount++;
      const filename = path.join(this.framesDir, `frame_${String(this.frameCount).padStart(4, '0')}.png`);
      await this.page.screenshot({ path: filename });
    }
  }

  async updatePointer(x, y) {
    await this.page.evaluate(({ x, y }) => {
      const p = document.getElementById('custom-mouse-pointer');
      if (p) {
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
      }
    }, { x, y });
  }

  async moveTo(x, y, steps = 6) {
    const startX = this.currentPos.x;
    const startY = this.currentPos.y;
    for (let i = 1; i <= steps; i++) {
      const curX = startX + (x - startX) * (i / steps);
      const curY = startY + (y - startY) * (i / steps);
      await this.updatePointer(curX, curY);
      await this.captureFrame(1);
    }
    this.currentPos = { x, y };
  }

  async moveToElement(selector, steps = 6) {
    const loc = this.page.locator(selector).first();
    const box = await loc.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await this.moveTo(targetX, targetY, steps);
      return { x: targetX, y: targetY };
    }
    return this.currentPos;
  }

  async clickElement(selector, steps = 6) {
    const loc = this.page.locator(selector).first();
    const box = await loc.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await this.moveTo(targetX, targetY, steps);

      // Ripple effect
      await this.page.evaluate(({ x, y }) => {
        const r = document.createElement('div');
        r.className = 'custom-ripple';
        r.style.left = `${x}px`;
        r.style.top = `${y}px`;
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 400);
      }, { x: targetX, y: targetY });

      await this.captureFrame(2);
      await loc.click();
      await this.captureFrame(3);
    }
  }

  async typeText(selector, text, stepsPerChar = 1) {
    const loc = this.page.locator(selector).first();
    const box = await loc.boundingBox();
    if (box) {
      await this.moveTo(box.x + box.width / 2, box.y + box.height / 2);
      await loc.click();
      await this.captureFrame(1);
    }

    await loc.fill('');
    let typed = '';
    for (const char of text) {
      typed += char;
      await loc.fill(typed);
      await loc.dispatchEvent('input');
      await loc.dispatchEvent('change');
      await this.captureFrame(stepsPerChar);
    }
    await this.captureFrame(2);
  }
}

async function generateStaticScreenshots(playwright) {
  console.log('=== Generating Static Screenshots ===');
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: 'ja-JP'
  });
  const page = await context.newPage();

  ensureDir(SCREENSHOT_DIR);

  await page.goto(BASE_URL);
  
  // 今日の日付と明日の日付を生成してダミータスクを注入
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  await page.evaluate(({ todayStr, tomorrowStr }) => {
    const dummyTodos = [
      {
        id: 'dummy-1',
        title: '報告書の作成と提出',
        detail: '<p>今週の進捗報告書を作成し、マネージャーへメール送信する。<strong>期限厳守！</strong></p>',
        dateType: 'datetime',
        deadline: `${todayStr}T17:00:00`,
        completed: false,
        createdAt: `${todayStr}T09:00:00`
      },
      {
        id: 'dummy-2',
        title: 'スーパーでの買い物',
        detail: '<ul><li>牛乳</li><li>食パン</li><li>卵</li></ul>',
        dateType: 'date',
        deadline: `${tomorrowStr}T00:00:00`,
        completed: false,
        createdAt: `${todayStr}T09:10:00`
      },
      {
        id: 'dummy-3',
        title: 'Gitリポジトリの整理',
        detail: '<p>古いブランチの削除およびドキュメントの整理を行う。</p>',
        dateType: 'none',
        deadline: null,
        completed: true,
        createdAt: `${todayStr}T09:20:00`
      }
    ];
    localStorage.setItem('todo-app-items', JSON.stringify(dummyTodos));
    window.location.reload();
  }, { todayStr, tomorrowStr });
  await page.waitForTimeout(500);

  // 1. メイン画面 (main_screen.jpg)
  console.log('Capturing main_screen.jpg...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'main_screen.jpg'), type: 'jpeg', quality: 90 });

  // 2. 新規登録モーダル (modal_new.jpg)
  console.log('Capturing modal_new.jpg...');
  await page.click('#btn-new');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_new.jpg'), type: 'jpeg', quality: 90 });
  await page.click('#btn-cancel');
  await page.waitForTimeout(300);

  // 3. 編集モーダル (modal_edit.jpg)
  console.log('Capturing modal_edit.jpg...');
  await page.click('text=報告書の作成と提出');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_edit.jpg'), type: 'jpeg', quality: 90 });
  await page.click('#btn-cancel');

  await browser.close();
  console.log('Static screenshots generated successfully.');
}

async function generateDemoGif(playwright) {
  console.log('=== Generating demo_todo_flow.gif ===');
  const framesDir = path.join(TEMP_FRAME_DIR, 'todo_flow');
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1000, height: 700 },
    deviceScaleFactor: 1,
    locale: 'ja-JP'
  });
  const page = await context.newPage();
  const recorder = new AnimationRecorder(page, framesDir);

  await page.goto(BASE_URL);
  
  await page.evaluate(() => {
    localStorage.clear();
    window.location.reload();
  });
  await page.waitForTimeout(500);

  await injectCustomPointer(page);
  await recorder.updatePointer(400, 200);
  await recorder.captureFrame(5);

  // 1. 新規ボタンをクリック
  await recorder.clickElement('#btn-new');
  await page.waitForTimeout(300);
  await injectCustomPointer(page);
  await recorder.captureFrame(3);

  // 2. タイトルを入力
  await recorder.typeText('#input-title', '牛乳とパンを買う', 1);
  
  // 3. 日時「日のみ」を選択
  await recorder.clickElement('#radio-date-day');
  await recorder.captureFrame(2);

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await recorder.clickElement('#dummy-date');
  await page.fill('#input-date', tomorrowStr);
  await page.dispatchEvent('#input-date', 'change');
  await recorder.captureFrame(4);

  // 4. 詳細の入力
  await recorder.moveToElement('.ql-editor');
  await page.click('.ql-editor');
  await page.evaluate(() => {
    const editor = document.querySelector('.ql-editor');
    editor.innerHTML = '<p>近所のスーパーで<strong>特売</strong>の牛乳と食パンを買う。</p>';
  });
  await recorder.captureFrame(10);

  // 5. 保存ボタンをクリック
  await recorder.clickElement('#btn-save');
  await page.waitForTimeout(300);
  await injectCustomPointer(page);
  await recorder.captureFrame(5);

  // 6. 完了トグルをクリック
  await recorder.clickElement('.btn-toggle-complete');
  await recorder.captureFrame(8);

  // 7. 「完了済」タブに切り替え
  await recorder.clickElement('#tab-completed');
  await recorder.captureFrame(6);

  // 8. 「すべて」タブに戻す
  await recorder.clickElement('#tab-all');
  await recorder.captureFrame(4);

  // 9. 完済を削除ボタンをクリック
  page.once('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });
  await recorder.clickElement('#btn-delete-completed');
  await page.waitForTimeout(500);
  await injectCustomPointer(page);
  await recorder.captureFrame(10);

  await browser.close();

  // Convert to GIF via ffmpeg
  const gifPath = path.join(SCREENSHOT_DIR, 'demo_todo_flow.gif');
  const cmd = `ffmpeg -y -framerate 10 -i "${framesDir}/frame_%04d.png" -vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gifPath}"`;
  console.log('Running ffmpeg for demo_todo_flow.gif...');
  execSync(cmd);
  console.log('demo_todo_flow.gif created successfully.');
}

async function main() {
  const playwright = require('@playwright/test');
  await generateStaticScreenshots(playwright);
  await generateDemoGif(playwright);
  
  if (fs.existsSync(TEMP_FRAME_DIR)) {
    fs.rmSync(TEMP_FRAME_DIR, { recursive: true, force: true });
  }
  console.log('=== All screenshots and demos successfully updated! ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
