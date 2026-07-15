import js from "@eslint/js";
import html from "eslint-plugin-html";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".nyc_output/**",
      "scripts/run-coverage.js"
    ]
  },
  js.configs.recommended,
  {
    plugins: {
      html
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // game/index.html 内のグローバル変数・定数・関数群
        BOARD_WIDTH: "writable",
        BOARD_HEIGHT: "writable",
        INITIAL_DROP_INTERVAL: "writable",
        DROP_INTERVAL_DECREASE: "writable",
        board: "writable",
        currentBlock: "writable",
        nextBlock: "writable",
        score: "writable",
        level: "writable",
        linesCleared: "writable",
        gameOver: "writable",
        isPaused: "writable",
        lastDropTime: "writable",
        currentTime: "writable",
        bag: "writable",
        keys: "writable",
        lastLeftMoveTime: "writable",
        lastRightMoveTime: "writable",
        lastSoftDropTime: "writable",
        init: "writable",
        getRandomBlock: "writable",
        canMove: "writable",
        fixBlock: "writable",
        clearLines: "writable",
        rotate: "writable",
        checkGameOver: "writable",
        update: "writable",
        draw: "writable",
        drawBlock: "writable",
        drawNextBlock: "writable",
        updateUI: "writable",
        adjustColorBrightness: "writable",
        handleLeft: "writable",
        handleRight: "writable",
        handleRotate: "writable",
        handleSoftDrop: "writable",
        handleHardDrop: "writable",
        handlePause: "writable",
        handleInput: "writable",
        setupTouchEvent: "writable",
        gameLoop: "writable",
      }
    },
    files: ["**/*.js", "**/*.html"],
    rules: {
      "no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
      "no-undef": "error",
      "no-inner-declarations": "off"
    }
  }
];
