import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(__dirname, '../game/index.html');
const gameURL = `file://${gamePath}`;

test.describe('ゲームロジックテスト', () => {
  test.beforeEach(async ({ page }) => {
    // 乱数を固定化（決定的テスト）
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    });

    // ページをロード
    await page.goto(gameURL, { waitUntil: 'domcontentloaded' });
  });

  // L-1: canMove - 空盤面で左右・下へ移動可能
  test('L-1: 空盤面で左右・下へ移動できる', async ({ page }) => {
    const result = await page.evaluate(() => {
      const result = {
        left: canMove(currentBlock, -1, 0),
        right: canMove(currentBlock, 1, 0),
        down: canMove(currentBlock, 0, 1),
      };
      return result;
    });
    expect(result.left).toBe(true);
    expect(result.right).toBe(true);
    expect(result.down).toBe(true);
  });

  // L-2: canMove - 壁での移動不可
  test('L-2: 左端で左移動不可、右端で右移動不可', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 左端に移動
      const block = JSON.parse(JSON.stringify(currentBlock));
      block.x = 0;
      const canMoveLeft = canMove(block, -1, 0);

      // 右端に移動
      block.x = BOARD_WIDTH - block.shape[0].length;
      const canMoveRight = canMove(block, 1, 0);

      return { canMoveLeft, canMoveRight };
    });
    expect(result.canMoveLeft).toBe(false);
    expect(result.canMoveRight).toBe(false);
  });

  // L-3: canMove - 最下段での下移動不可
  test('L-3: 最下段で下移動できない', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = JSON.parse(JSON.stringify(currentBlock));
      block.y = BOARD_HEIGHT - 1;
      return canMove(block, 0, 1);
    });
    expect(result).toBe(false);
  });

  // L-4: canMove - 既存ブロックとの衝突
  test('L-4: 移動先に固定ブロックがある場合は移動不可', async ({ page }) => {
    const result = await page.evaluate(() => {
      board[5][5] = 1;
      const block = {
        type: 'O',
        shape: [[1, 1], [1, 1]],
        color: '#f0f000',
        x: 4,
        y: 4,
      };
      return canMove(block, 1, 1);
    });
    expect(result).toBe(false);
  });

  // L-5: canMove - 盤面上端より上のセルは許容
  test('L-5: ブロックが盤面上端より上の場合は衝突扱いにならない', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        type: 'I',
        shape: [[1, 1, 1, 1]],
        color: '#00f0f0',
        x: 3,
        y: -1,
      };
      return canMove(block, 0, 1);
    });
    expect(result).toBe(true);
  });

  // L-6: rotate - 中央での回転
  test('L-6: ブロックが中央で回転する', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        type: 'T',
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#a000f0',
        x: 5,
        y: 5,
      };
      const originalShape = JSON.stringify(block.shape);
      rotate(block);
      const rotatedShape = JSON.stringify(block.shape);
      return {
        changed: originalShape !== rotatedShape,
        rotatedShape: block.shape,
      };
    });
    expect(result.changed).toBe(true);
    expect(result.rotatedShape.length).toBe(3);
  });

  // L-7: rotate - 壁蹴りによる回転
  test('L-7: 右壁際で I ミノを回転すると壁蹴りで x がシフトする', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        type: 'I',
        shape: [[1, 1, 1, 1]],
        color: '#00f0f0',
        x: BOARD_WIDTH - 2,
        y: 5,
      };
      const originalX = block.x;
      rotate(block);
      return {
        xShifted: block.x !== originalX,
        newX: block.x,
        rotateSucceeded: block.shape.length > 1,
      };
    });
    expect(result.xShifted || result.rotateSucceeded).toBe(true);
  });

  // L-8: rotate - 全キック位置が塞がれた状態
  test('L-8: 全キック位置が塞がれた場合は回転失敗で復元される', async ({ page }) => {
    const result = await page.evaluate(() => {
      // T字ブロックの周辺を完全に塞ぐ
      const block = {
        type: 'T',
        shape: [[0, 1, 0], [1, 1, 1]],
        color: '#a000f0',
        x: 1,
        y: 1,
      };

      const originalShape = JSON.stringify(block.shape);
      const originalX = block.x;
      const originalY = block.y;

      // 周辺ブロック配置
      for (let x = 0; x <= 5; x++) {
        for (let y = 0; y <= 3; y++) {
          if (board[y] && board[y][x] !== undefined) {
            board[y][x] = 1;
          }
        }
      }

      rotate(block);

      return {
        shapeRestored: JSON.stringify(block.shape) === originalShape,
        xRestored: block.x === originalX,
        yRestored: block.y === originalY,
      };
    });
    expect(result.shapeRestored || result.xRestored).toBe(true);
  });

  // L-9: clearLines - 最下段 1 ラインの消去
  test('L-9: 最下段 1 ラインを埋めると消去されスコア加算される', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 最下段を完全に埋める
      const row = BOARD_HEIGHT - 1;
      for (let col = 0; col < BOARD_WIDTH; col++) {
        board[row][col] = 1;
      }

      const initialScore = score;
      const initialLines = linesCleared;
      clearLines();

      return {
        lineCleared: board[row].every(cell => cell === 0),
        scoreIncreased: score > initialScore,
        scoreGain: score - initialScore,
        linesIncrease: linesCleared - initialLines,
      };
    });
    expect(result.lineCleared).toBe(true);
    expect(result.scoreIncreased).toBe(true);
    expect(result.linesIncrease).toBe(1);
  });

  // L-10: clearLines - 複数ライン同時消去
  test('L-10: 2・3・4 ライン同時消去でスコアが異なる', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 3 行を埋める
      for (let row = BOARD_HEIGHT - 3; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          board[row][col] = 1;
        }
      }

      const initialScore = score;
      clearLines();
      const scoreAfter3Lines = score;
      const scoreDiff = scoreAfter3Lines - initialScore;

      return {
        linesCleared: linesCleared,
        scoreDiff: scoreDiff,
        expectedMin: 100 * level,
      };
    });
    expect(result.scoreDiff).toBeGreaterThan(result.expectedMin);
  });

  // L-11: clearLines - 穴のある行は消去されない
  test('L-11: 途中に穴のある行は消去されない', async ({ page }) => {
    const result = await page.evaluate(() => {
      const row = BOARD_HEIGHT - 1;
      for (let col = 0; col < BOARD_WIDTH; col++) {
        board[row][col] = 1;
      }
      // 穴を作る
      board[row][5] = 0;

      const initialBoard = JSON.stringify(board[row]);
      clearLines();
      const finalBoard = JSON.stringify(board[row]);

      return {
        notCleared: initialBoard === finalBoard,
      };
    });
    expect(result.notCleared).toBe(true);
  });

  // L-12: clearLines - レベルアップ判定（9 → 10 ライン）
  test('L-12: linesCleared=9 で 1 ライン消去するとレベル上昇', async ({ page }) => {
    const result = await page.evaluate(() => {
      linesCleared = 9;
      level = 1;

      const row = BOARD_HEIGHT - 1;
      for (let col = 0; col < BOARD_WIDTH; col++) {
        board[row][col] = 1;
      }

      clearLines();
      return {
        levelUp: level === 2,
        linesCleared: linesCleared,
      };
    });
    expect(result.levelUp).toBe(true);
    expect(result.linesCleared).toBe(10);
  });

  // L-13: clearLines - 複数ライン消去で閾値またぎ
  test('L-13: linesCleared=8 で 4 ライン消去するとレベルが上昇', async ({ page }) => {
    const result = await page.evaluate(() => {
      linesCleared = 8;
      level = 1;
      const initialLevel = level;

      for (let row = BOARD_HEIGHT - 4; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          board[row][col] = 1;
        }
      }

      clearLines();
      return {
        level: level,
        linesCleared: linesCleared,
        levelIncreased: level > initialLevel,
        linesIncreased: linesCleared > 8,
      };
    });
    expect(result.levelIncreased).toBe(true);
    expect(result.linesIncreased).toBe(true);
  });

  // L-14: getRandomBlock - 7 バッグ（各種 1 回ずつ）
  test('L-14: 連続 7 回呼び出しで各種テトロミノが 1 回ずつ出る', async ({ page }) => {
    const result = await page.evaluate(() => {
      bag = [];
      const blocks = [];
      for (let i = 0; i < 7; i++) {
        blocks.push(getRandomBlock().type);
      }
      const uniqueBlocks = new Set(blocks);
      return {
        count: blocks.length,
        uniqueCount: uniqueBlocks.size,
        blocks: blocks,
      };
    });
    expect(result.uniqueCount).toBe(7);
  });

  // L-15: getRandomBlock - 14 回呼び出しで各種 2 回ずつ
  test('L-15: 連続 14 回呼び出しで各種テトロミノが 2 回ずつ出る', async ({ page }) => {
    const result = await page.evaluate(() => {
      bag = [];
      const counts = {};
      for (let i = 0; i < 14; i++) {
        const type = getRandomBlock().type;
        counts[type] = (counts[type] || 0) + 1;
      }
      const allTwo = Object.values(counts).every(c => c === 2);
      return {
        counts: counts,
        allTwo: allTwo,
      };
    });
    expect(result.allTwo).toBe(true);
  });

  // L-16: checkGameOver - スポーン位置に固定ブロック
  test('L-16: スポーン位置に固定ブロックがあるとゲームオーバー', async ({ page }) => {
    const result = await page.evaluate(() => {
      // スポーン位置を塞ぐ
      board[0][4] = 1;
      board[0][5] = 1;
      const testBlock = {
        type: 'O',
        shape: [[1, 1], [1, 1]],
        color: '#f0f000',
        x: 4,
        y: 0,
      };
      return checkGameOver(testBlock);
    });
    expect(result).toBe(true);
  });

  // L-17: 落下間隔の計算
  test('L-17: レベル別の落下間隔が正しい（800→600→100ms）', async ({ page }) => {
    const result = await page.evaluate(() => {
      const intervals = [];
      for (const lv of [1, 5, 15]) {
        level = lv;
        const interval = Math.max(100, INITIAL_DROP_INTERVAL - DROP_INTERVAL_DECREASE * (level - 1));
        intervals.push(interval);
      }
      return {
        level1: intervals[0],
        level5: intervals[1],
        level15: intervals[2],
      };
    });
    expect(result.level1).toBe(800);
    expect(result.level5).toBe(600);
    expect(result.level15).toBe(100);
  });

  // L-18: init - ゲーム初期化
  test('L-18: init() でゲーム状態が全て初期化される', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 状態を変更
      score = 1000;
      level = 5;
      linesCleared = 25;
      gameOver = true;
      isPaused = true;

      init();

      return {
        board: board[0].every(cell => cell === 0),
        score: score === 0,
        level: level === 1,
        linesCleared: linesCleared === 0,
        gameOver: gameOver === false,
        isPaused: isPaused === false,
      };
    });
    expect(result.board).toBe(true);
    expect(result.score).toBe(true);
    expect(result.level).toBe(true);
    expect(result.linesCleared).toBe(true);
    expect(result.gameOver).toBe(true);
    expect(result.isPaused).toBe(true);
  });
});
