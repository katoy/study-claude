import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to inject a visual mouse cursor and click ripple effect
async function injectCursor(page) {
  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  await page.addInitScript(() => {
    console.log('--- Fake Cursor Script Injected ---');

    let cursor = null;

    // Detect if there's an active (open) dialog to bypass Top Layer clipping
    function getCursorParent() {
      const openDialog = document.querySelector('dialog[open]');
      return openDialog || document.body || document.documentElement;
    }

    function createCursor() {
      const parent = getCursorParent();
      cursor = document.getElementById('playwright-fake-cursor');

      if (!cursor) {
        console.log('Creating fake cursor DOM element...');
        cursor = document.createElement('div');
        cursor.id = 'playwright-fake-cursor';
        Object.assign(cursor.style, {
          position: 'fixed', // Fixed layout relative to viewport
          width: '18px',
          height: '18px',
          background: 'rgba(255, 50, 50, 0.9)',
          border: '2px solid white',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: '999999',
          transform: 'translate(-50%, -50%)',
          left: '-100px', // Off-screen initially
          top: '-100px',
          boxShadow: '0 0 6px rgba(0,0,0,0.5)',
          transition: 'background-color 0.1s, transform 0.1s',
        });
        parent.appendChild(cursor);
        console.log(`Appended cursor to: ${parent.tagName}`);
      } else if (cursor.parentNode !== parent) {
        // If parent has changed (e.g. dialog opened/closed), move the cursor element
        parent.appendChild(cursor);
        console.log(`Moved cursor parent to: ${parent.tagName}`);
      }
    }

    // Initialize cursor
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createCursor);
    } else {
      createCursor();
    }

    // Track mouse movement
    window.addEventListener(
      'mousemove',
      (e) => {
        createCursor(); // Ensure cursor exists and is attached to the correct parent
        if (cursor) {
          cursor.style.left = `${e.clientX}px`;
          cursor.style.top = `${e.clientY}px`;
        }
      },
      true
    );

    // Mouse down animation
    window.addEventListener(
      'mousedown',
      () => {
        createCursor();
        if (cursor) {
          cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
          cursor.style.backgroundColor = 'rgba(255, 0, 0, 1)';
        }
      },
      true
    );

    // Mouse up animation
    window.addEventListener(
      'mouseup',
      () => {
        createCursor();
        if (cursor) {
          cursor.style.transform = 'translate(-50%, -50%) scale(1)';
          cursor.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
        }
      },
      true
    );

    // Click ripple effect
    window.addEventListener(
      'click',
      (e) => {
        console.log(`Click registered at clientX=${e.clientX}, clientY=${e.clientY}`);
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
          transition: 'transform 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.4s ease-out',
        });

        const parent = getCursorParent();
        parent.appendChild(ripple);

        // Trigger ripple scaling animation
        setTimeout(() => {
          ripple.style.transform = 'translate(-50%, -50%) scale(1)';
          ripple.style.opacity = '0';
        }, 10);

        // Cleanup ripple DOM element
        setTimeout(() => ripple.remove(), 500);
      },
      true
    );
  });
}

// Smoothly move mouse cursor to target element and click (more steps for better GIF visibility)
async function smoothClick(page, selector) {
  const element = await page.waitForSelector(selector);
  const box = await element.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    console.log(`Moving mouse smoothly to selector: ${selector} [${x}, ${y}]`);
    // Increased steps to 30 to make the cursor trackable at 10fps in the GIF
    await page.mouse.move(x, y, { steps: 30 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(300);
  } else {
    console.log(`Falling back to standard click for selector: ${selector}`);
    await page.click(selector);
  }
}

// Smoothly move mouse cursor to target element, click to focus, and type text
async function smoothFill(page, selector, text) {
  const element = await page.waitForSelector(selector);
  const box = await element.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    console.log(`Moving mouse smoothly to selector for input: ${selector} [${x}, ${y}]`);
    await page.mouse.move(x, y, { steps: 30 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    await element.fill(text);
    await page.waitForTimeout(300);
  } else {
    console.log(`Falling back to standard fill for selector: ${selector}`);
    await page.fill(selector, text);
  }
}

async function main() {
  console.log('🎥 ToDo App Demo GIF Recorder (Cursor Visualization - Dialog Overlay Support)');
  console.log('============================================================');

  const videoDir = path.join(rootDir, 'temp_video');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
  }

  // 1. Launch browser - Prefer headful mode (headless: false) for accurate UI and animation rendering
  let browser;
  try {
    console.log('🌐 Launching browser in headful mode (headless: false)...');
    browser = await chromium.launch({ headless: false });
  } catch {
    console.log('⚠️ Failed to launch in headful mode, falling back to headless: true');
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1024, height: 768 },
    },
  });

  const page = await context.newPage();

  // Inject the fake cursor styles and logic
  await injectCursor(page);

  const fileUrl = `file://${path.join(rootDir, 'dist', 'index.html')}`;

  console.log(`🔗 Navigating to: ${fileUrl}`);
  await page.goto(fileUrl);
  await page.waitForTimeout(1500);

  // Initialize cursor at a neutral center position
  await page.mouse.move(512, 384);
  await page.waitForTimeout(500);

  // 2. Perform Todo application demo sequence with smooth mouse motions
  console.log('➕ Clicking "New Todo" button...');
  await smoothClick(page, '#btn-new');
  await page.waitForTimeout(800);

  console.log('✍️ Filling out the Todo form...');
  await smoothFill(page, '#todo-title', '技術仕様書のレビュー');
  await page.waitForTimeout(500);

  // Select "Day only" option for due date
  console.log('📅 Selecting date option...');
  await smoothClick(page, '#due-date');
  await page.waitForTimeout(500);

  // Click on the invisible date picker to trigger the calendar popup
  console.log('📅 Clicking date picker to open calendar UI...');
  await smoothClick(page, '#due-date-picker');
  await page.waitForTimeout(1500); // Keep calendar open for a moment in the video

  console.log('⌨️ Navigating calendar via keyboard...');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Fallback: Ensure the date value is filled if keypresses were bypassed
  await page.evaluate(() => {
    const picker = document.querySelector('#due-date-picker');
    if (!picker.value) {
      picker.value = '2026-07-28';
      picker.dispatchEvent(new Event('change'));
    }
  });
  await page.waitForTimeout(500);

  // Fill in rich text editor details (Quill editor wrapper)
  console.log('✍️ Writing description in rich text editor...');
  await smoothClick(page, '.ql-editor');
  await page.fill(
    '.ql-editor',
    '完了定義に沿って、APIエンドポイントと認証周りのセキュリティ設計をレビューする。'
  );
  await page.waitForTimeout(1000);

  console.log('💾 Saving Todo...');
  await smoothClick(page, '#btn-save-todo');
  await page.waitForTimeout(1500);

  console.log('✅ Marking Todo as completed...');
  await smoothClick(page, '.btn-toggle-complete');
  await page.waitForTimeout(1500);

  console.log('🔍 Testing view filters...');
  await smoothClick(page, '#tab-completed');
  await page.waitForTimeout(1500);

  await smoothClick(page, '#tab-active');
  await page.waitForTimeout(1500);

  await smoothClick(page, '#tab-all');
  await page.waitForTimeout(1500);

  // 3. Close the browser to flush the video file to disk
  console.log('🏁 Closing browser...');
  await context.close();
  await browser.close();

  // Find the generated webm file
  const files = fs.readdirSync(videoDir);
  const webmFile = files.find((f) => f.endsWith('.webm'));

  if (!webmFile) {
    throw new Error('No webm video file was generated.');
  }

  const webmPath = path.join(videoDir, webmFile);
  const gifPath = path.join(rootDir, 'screenshots', 'demo_animation.gif');

  // Ensure screenshots directory exists
  const screenshotsDir = path.dirname(gifPath);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`🎬 Converting webm to high-quality GIF using ffmpeg...`);
  // Use optimal palette generation for high-quality, lightweight GIF
  const ffmpegCmd = `ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`;
  execSync(ffmpegCmd);

  console.log(`🧹 Cleaning up temporary video directory...`);
  fs.rmSync(videoDir, { recursive: true, force: true });

  console.log(`\n🎉 Success! GIF generated at: ${gifPath}`);
}

main().catch((err) => {
  console.error('❌ Error recording demo:', err);
  process.exit(1);
});
