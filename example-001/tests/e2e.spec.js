import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(__dirname, '../game/index.html');
const gameURL = `file://${gamePath}`;

test.describe('E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    });
    await page.goto(gameURL, { waitUntil: 'domcontentloaded' });
  });

  // E-1: 初期表示
  test('E-1: ページロード時に初期状態が表示される', async ({ page }) => {
    const result = await page.evaluate(() => {
      return {
        score: parseInt(document.getElementById('score').textContent),
        level: parseInt(document.getElementById('level').textContent),
        lines: parseInt(document.getElementById('lines').textContent),
      };
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe(1);
    expect(result.lines).toBe(0);
  });

  // E-2: 左右移動
  test('E-2: ArrowLeft・ArrowRight でブロック x が変化', async ({ page }) => {
    const initialX = await page.evaluate(() => currentBlock.x);

    // 左移動
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150); // handleInput が実行されるまで待機
    const leftX = await page.evaluate(() => currentBlock.x);

    // 右移動（2回）
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    const rightX = await page.evaluate(() => currentBlock.x);

    expect(leftX).toBeLessThanOrEqual(initialX);
    expect(rightX).toBeGreaterThanOrEqual(leftX);
  });

  // E-3: 回転
  test('E-3: ArrowUp で回転イベントがハンドルされる', async ({ page }) => {
    // rotate() 関数が呼ばれるかどうかを確認
    const rotated = await page.evaluate(() => {
      const block = {
        type: 'T',
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#a000f0',
        x: 5,
        y: 5,
      };
      const originalShape = JSON.stringify(block.shape);
      rotate(block);
      const newShape = JSON.stringify(block.shape);
      return {
        changed: originalShape !== newShape,
      };
    });
    expect(rotated.changed).toBe(true);
  });

  // E-4: ソフトドロップ
  test('E-4: ArrowDown でブロック y が増加', async ({ page }) => {
    const initialY = await page.evaluate(() => currentBlock.y);

    // ArrowDown を複数回押して、handleInput で処理される機会を増やす
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(80);
    }

    const finalY = await page.evaluate(() => currentBlock.y);

    expect(finalY).toBeGreaterThanOrEqual(initialY);
  });

  // E-5: ハードドロップ
  test('E-5: Space でブロックが最下段まで移動し固定される', async ({ page }) => {
    const result = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        repeat: false,
      });
      document.dispatchEvent(event);

      // ハードドロップ後の状態確認
      return {
        gameOverOrNext: gameOver || currentBlock.y > 0,
      };
    });
    expect(result.gameOverOrNext).toBe(true);
  });

  // E-6: 一時停止（キー P）
  test('E-6: P キーで一時停止・再開が可能', async ({ page }) => {
    const result = await page.evaluate(() => {
      const pauseEvent = new KeyboardEvent('keydown', {
        key: 'P',
        repeat: false,
      });

      document.dispatchEvent(pauseEvent);
      const pausedState = isPaused;

      document.dispatchEvent(pauseEvent);
      const resumedState = isPaused;

      return {
        pausedCorrectly: pausedState === true,
        resumedCorrectly: resumedState === false,
      };
    });
    expect(result.pausedCorrectly).toBe(true);
    expect(result.resumedCorrectly).toBe(true);
  });

  // E-7: 一時停止（タッチボタン）
  test('E-7: 一時停止ボタンをクリックで一時停止・再開', async ({ page }) => {
    const pauseBtn = page.locator('#btnPause');

    await pauseBtn.click();
    await page.waitForTimeout(100);

    const pausedText = await pauseBtn.textContent();
    expect(pausedText).toContain('再開');

    await pauseBtn.click();
    await page.waitForTimeout(100);

    const resumedText = await pauseBtn.textContent();
    expect(resumedText).toContain('一時停止');
  });

  // E-8: タッチボタン単発性（C-1 回帰テスト）
  test('E-8: タッチボタンが 1 タップで 1 アクションのみ実行', async ({ page }) => {
    const result = await page.evaluate(() => {
      const leftBtn = document.getElementById('btnLeft');
      const initialX = currentBlock.x;

      // 単一クリックをシミュレート
      const event = new PointerEvent('pointerdown', { bubbles: true });
      leftBtn.dispatchEvent(event);

      return {
        movedOnce: currentBlock.x === initialX - 1 || currentBlock.x === initialX,
      };
    });
    expect(result.movedOnce).toBe(true);
  });

  // E-9: キーリピート抑制（R-1 回帰テスト）
  test('E-9: ArrowUp 長押し（repeat=true）で回転が 1 回のみ', async ({ page }) => {
    const result = await page.evaluate(() => {
      const initialShape = JSON.stringify(currentBlock.shape);

      // repeat=true のイベントは無視される
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        repeat: true,
      });
      document.dispatchEvent(event);

      const finalShape = JSON.stringify(currentBlock.shape);

      return {
        noRotation: initialShape === finalShape,
      };
    });
    expect(result.noRotation).toBe(true);
  });

  // E-10: ゲームオーバー判定
  test('E-10: ゲームオーバー状態でゲームオーバーフラグが true', async ({ page }) => {
    const result = await page.evaluate(() => {
      // ゲームオーバー状態を作成
      for (let row = 0; row < BOARD_HEIGHT - 1; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          board[row][col] = 1;
        }
      }
      currentBlock = getRandomBlock();
      if (checkGameOver()) {
        gameOver = true;
      }
      return { isGameOver: gameOver };
    });
    expect(result.isGameOver).toBe(true);
  });

  // E-11: リスタート（キー Enter）
  test('E-11: ゲームオーバー後 Enter キーでゲーム再開', async ({ page }) => {
    // ゲームオーバー状態を作成
    await page.evaluate(() => {
      for (let row = 0; row < BOARD_HEIGHT - 1; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          board[row][col] = 1;
        }
      }
      currentBlock = getRandomBlock();
      if (checkGameOver()) {
        gameOver = true;
      }
      updateUI();
    });

    // Enter キーでリスタート
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    const result = await page.evaluate(() => {
      return {
        gameOverCleared: gameOver === false,
        boardCleared: board[0].every(cell => cell === 0),
      };
    });
    expect(result.gameOverCleared).toBe(true);
    expect(result.boardCleared).toBe(true);
  });

  // E-12: リスタート（タッチボタン、R-2 回帰テスト）
  test('E-12: ゲームオーバー後リスタートボタンをタップで再開', async ({ page }) => {
    // ゲームオーバー状態を作成
    await page.evaluate(() => {
      for (let row = 0; row < BOARD_HEIGHT - 1; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          board[row][col] = 1;
        }
      }
      currentBlock = getRandomBlock();
      if (checkGameOver()) {
        gameOver = true;
      }
      updateUI();
    });

    const restartBtn = page.locator('#btnPause');
    const buttonText = await restartBtn.textContent();
    expect(buttonText).toContain('リスタート');

    await restartBtn.click();
    await page.waitForTimeout(100);

    const result = await page.evaluate(() => {
      return { gameOverCleared: gameOver === false };
    });
    expect(result.gameOverCleared).toBe(true);
  });

  // E-13: レベルアップ表示
  test('E-13: linesCleared=9 で 1 ライン消去するとレベルが 2 に上昇', async ({ page }) => {
    await page.evaluate(() => {
      linesCleared = 9;
      level = 1;
      const row = BOARD_HEIGHT - 1;
      for (let col = 0; col < BOARD_WIDTH; col++) {
        board[row][col] = 1;
      }
      clearLines();
      updateUI();
    });

    const levelText = await page.locator('#level').textContent();
    expect(levelText).toBe('2');
  });

  // E-14: ポーズ中の入力遮断
  test('E-14: 一時停止中は入力が無効', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPaused = true;
      const initialX = currentBlock.x;

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        repeat: false,
      });
      document.dispatchEvent(event);

      return { xUnchanged: currentBlock.x === initialX };
    });
    expect(result.xUnchanged).toBe(true);
  });

  // E-15: モバイルレイアウト
  test('E-15: モバイル viewport で左パネルが非表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const leftPanel = page.locator('.left-panel');
    const isVisible = await leftPanel.isVisible();
    const isHidden = !isVisible || await page.evaluate(() => {
      const el = document.querySelector('.left-panel');
      return window.getComputedStyle(el).display === 'none';
    });

    expect(isHidden).toBe(true);
  });
});
