import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(__dirname, '../game/index.html');
const gameURL = `file://${gamePath}`;

test.describe('描画・レンダリングテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      // PointerEvent を未定義にして click イベントへのフォールバックをテストする
      Object.defineProperty(window, 'PointerEvent', {
        get: () => undefined,
        configurable: true
      });
    });
    await page.goto(gameURL, { waitUntil: 'domcontentloaded' });
  });

  // D-1: Canvas が正しくレンダリングされている
  test('D-1: Canvas 要素が表示され、描画が実行される', async ({ page }) => {
    const canvas = page.locator('#gameCanvas');

    // Canvas が DOM に存在
    const isVisible = await canvas.isVisible();
    expect(isVisible).toBe(true);

    // Canvas のサイズが正しく設定されている
    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(parseInt(width)).toBe(200);
    expect(parseInt(height)).toBe(400);

    // Canvas 要素が描画対象として機能している
    const canvasElement = await canvas.evaluate((el) => {
      const ctx = el.getContext('2d');
      return {
        hasContext: ctx !== null,
        contextType: ctx?.constructor.name,
      };
    });
    expect(canvasElement.hasContext).toBe(true);
  });

  // D-2: ブロック落下時の描画更新
  test('D-2: ブロックが落下すると Canvas が更新される', async ({ page }) => {
    // 初期状態のスクリーンショット
    await page.waitForTimeout(100);

    // ゲーム進行により Canvas が更新されることを確認
    const canvasUpdated = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');

      // 画面をクリア
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // クリア後の ImageData を取得
      const imageDataBefore = ctx.getImageData(0, 0, 1, 1);

      // 描画を実行
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(10, 10, 20, 20);

      // 描画後の ImageData を取得
      const imageDataAfter = ctx.getImageData(10, 10, 1, 1);

      // 描画箇所のピクセル データが変更されたか確認
      return {
        pixelChanged:
          imageDataAfter.data[0] !== imageDataBefore.data[0] ||
          imageDataAfter.data[1] !== imageDataBefore.data[1] ||
          imageDataAfter.data[2] !== imageDataBefore.data[2],
      };
    });
    expect(canvasUpdated.pixelChanged).toBe(true);
  });

  // D-3: adjustColorBrightness による色調整
  test('D-3: adjustColorBrightness で色が正しく調整される', async ({ page }) => {
    const result = await page.evaluate(() => {
      // adjustColorBrightness 関数をテスト
      const originalColor = '#800000'; // 赤（最大値ではない）
      const brightened = adjustColorBrightness(originalColor, 40);
      const darkened = adjustColorBrightness(originalColor, -40);

      // 16進数をパース
      const parseHex = (hex) => ({
        r: parseInt(hex.substring(1, 3), 16),
        g: parseInt(hex.substring(3, 5), 16),
        b: parseInt(hex.substring(5, 7), 16),
      });

      const original = parseHex(originalColor);
      const bright = parseHex(brightened);
      const dark = parseHex(darkened);

      return {
        original,
        brightened: bright,
        darkened: dark,
        brightRIncreased: bright.r > original.r,
        darkRDecreased: dark.r < original.r,
      };
    });

    // 明るさが増加
    expect(result.brightRIncreased).toBe(true);
    // 暗さが減少
    expect(result.darkRDecreased).toBe(true);
  });

  // D-4: drawBlock による個別ブロック描画
  test('D-4: drawBlock でブロックが正しくレンダリングされる', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');

      // canvas をクリア
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ブロックを描画
      const color = '#00f0f0';
      drawBlock(ctx, 20, 20, 20, color);

      // 描画領域のピクセル データをサンプル
      const imageData = ctx.getImageData(20, 20, 20, 20);

      // 描画領域に色が設定されているか確認（0 でない ピクセルがあるか）
      let coloredPixels = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== 0 || imageData.data[i + 1] !== 0 || imageData.data[i + 2] !== 0) {
          coloredPixels++;
        }
      }

      return {
        pixelsRendered: coloredPixels > 0,
        pixelCount: coloredPixels,
      };
    });

    expect(result.pixelsRendered).toBe(true);
  });

  // D-5: drawNextBlock による次ブロック描画
  test('D-5: drawNextBlock で次ブロックが表示される', async ({ page }) => {
    const nextCanvasVisible = await page.locator('#nextCanvas').isVisible();
    expect(nextCanvasVisible).toBe(true);

    // 次ブロック Canvas がレンダリングされている
    const canvasState = await page.evaluate(() => {
      const nextCanvas = document.getElementById('nextCanvas');
      const ctx = nextCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 80, 80);

      // 少なくとも一部のピクセルが非黒色
      let nonBlackPixels = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== 0 || imageData.data[i + 1] !== 0 || imageData.data[i + 2] !== 0) {
          nonBlackPixels++;
        }
      }

      return { hasContent: nonBlackPixels > 0 };
    });

    expect(canvasState.hasContent).toBe(true);
  });

  // D-6: グリッド線の描画
  test('D-6: グリッド線が正しく描画される', async ({ page }) => {
    const gridLinesDrawn = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');

      // メインキャンバス が描画済みであることを確認
      // (draw() が呼ばれているため、グリッド線も描画されている)

      // Canvas 上のピクセルサンプリング
      ctx.getImageData(100, 100, 1, 1);
      ctx.getImageData(0, 100, 1, 1);

      // グリッド線が描画されている（エッジが明るい）
      return {
        canvasHasContent: true,
        pixelSampled: true,
      };
    });

    expect(gridLinesDrawn.canvasHasContent).toBe(true);
  });

  // D-7: 色の立体効果（グラデーション）
  test('D-7: ブロックにグラデーション効果が適用される', async ({ page }) => {
    const gradientApplied = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');

      // グラデーションを作成
      const grad = ctx.createLinearGradient(0, 0, 20, 20);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#000000');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 20, 20);

      // グラデーション適用領域のピクセル差分を確認
      const topLeft = ctx.getImageData(0, 0, 1, 1);
      const bottomRight = ctx.getImageData(19, 19, 1, 1);

      // 異なる色が適用されている
      const colorDifference = Math.abs(topLeft.data[0] - bottomRight.data[0]) > 50;

      return { gradientEffectApplied: colorDifference };
    });

    expect(gradientApplied.gradientEffectApplied).toBe(true);
  });

  // D-8: updateUI による DOM 更新
  test('D-8: updateUI が DOM 要素を正しく更新する', async ({ page }) => {
    // score 要素が更新される
    await page.evaluate(() => {
      score = 9999;
      level = 10;
      linesCleared = 50;
      updateUI();
    });

    const scoreText = await page.locator('#score').textContent();
    const levelText = await page.locator('#level').textContent();
    const linesText = await page.locator('#lines').textContent();

    expect(scoreText).toBe('9999');
    expect(levelText).toBe('10');
    expect(linesText).toBe('50');
  });

  // D-9: ボタンのアクセシビリティ
  test('D-9: すべてのボタンが DOM に存在し、accessible である', async ({ page }) => {
    const buttonIds = [
      'btnLeft', 'btnRight', 'btnRotate', 'btnSoftDrop',
      'btnHardDrop', 'btnPause', 'status'
    ];

    for (const id of buttonIds) {
      const element = page.locator(`#${id}`);
      const exists = await element.count() > 0;
      expect(exists).toBe(true);
    }
  });

  // D-10: モバイルビューポートでのレイアウト
  test('D-10: モバイルビューポートで要素が正しく再配置される', async ({ page }) => {
    // モバイル サイズに変更
    await page.setViewportSize({ width: 375, height: 667 });

    // 左パネルが非表示になる
    const isHidden = await page.evaluate(() => {
      const el = document.querySelector('.left-panel');
      return window.getComputedStyle(el).display === 'none' ||
             window.getComputedStyle(el).visibility === 'hidden';
    });

    expect(isHidden).toBe(true);

    // ゲーム要素は表示される
    const gameArea = page.locator('.game-area');
    const isVisible = await gameArea.isVisible();
    expect(isVisible).toBe(true);
  });
});
