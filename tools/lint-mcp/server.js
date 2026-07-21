#!/usr/bin/env node

/**
 * 汎用 Lint MCP サーバー
 * 複数言語・ツールに対応した Lint/Format MCP サーバー
 * 対応言語: JavaScript, Python, PHP
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// MCP サーバーの基本構造
class LintMCPServer {
  constructor() {
    this.tools = [
      {
        name: "run_eslint",
        description: "ESLint でコードをチェック（JavaScript）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "検査対象ファイルパス",
            },
            fix: {
              type: "boolean",
              description: "自動修正を行うか（デフォルト: false）",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_prettier",
        description: "Prettier でコードをフォーマット（JavaScript）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "フォーマット対象ファイルパス",
            },
            check: {
              type: "boolean",
              description: "チェックのみ（修正しない）",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_pylint",
        description: "PyLint でコードをチェック（Python）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "検査対象ファイルパス",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_black",
        description: "Black でコードをフォーマット（Python）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "フォーマット対象ファイルパス",
            },
            check: {
              type: "boolean",
              description: "チェックのみ（修正しない）",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_phpstan",
        description: "PHPStan でコードをチェック（PHP）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "検査対象ファイルパス",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_pint",
        description: "Laravel Pint でコードをフォーマット（PHP）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "フォーマット対象ファイルパス",
            },
            test: {
              type: "boolean",
              description: "チェックのみ（修正しない）",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "run_htmlhint",
        description: "HTMLHint でコードをチェック（HTML）",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "検査対象ファイルパス",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "list_linters",
        description: "利用可能な Linter 一覧を取得",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  // 外部コマンド実行
  async runCommand(command, args = [], cwd = process.cwd()) {
    return new Promise((resolve) => {
      const process = spawn(command, args, { cwd, shell: true });
      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0,
        });
      });

      process.on("error", (err) => {
        resolve({
          code: -1,
          stdout: "",
          stderr: err.message,
          success: false,
        });
      });
    });
  }

  // ESLint 実行
  async runESLint(filePath, fix = false) {
    const args = ["eslint", filePath];
    if (fix) args.push("--fix");
    args.push("--format=json");

    const result = await this.runCommand(args.join(" "));
    try {
      const parsed = JSON.parse(result.stdout);
      return {
        tool: "ESLint",
        file: filePath,
        success: result.success,
        messages: parsed[0]?.messages || [],
        fixed: fix,
        raw: result.stdout,
      };
    } catch (e) {
      return {
        tool: "ESLint",
        file: filePath,
        success: result.success,
        error: result.stderr || e.message,
      };
    }
  }

  // Prettier 実行
  async runPrettier(filePath, check = false) {
    const args = ["prettier"];
    if (check) {
      args.push("--check");
    } else {
      args.push("--write");
    }
    args.push(filePath);

    const result = await this.runCommand(args.join(" "));
    return {
      tool: "Prettier",
      file: filePath,
      success: result.success,
      check: check,
      output: result.stdout,
      error: result.stderr,
    };
  }

  // PyLint 実行
  async runPyLint(filePath) {
    const result = await this.runCommand(`pylint --output-format=json ${filePath}`);
    try {
      const parsed = JSON.parse(result.stdout);
      return {
        tool: "PyLint",
        file: filePath,
        success: result.success,
        messages: parsed,
        raw: result.stdout,
      };
    } catch (e) {
      return {
        tool: "PyLint",
        file: filePath,
        success: result.success,
        error: result.stderr || e.message,
      };
    }
  }

  // Black 実行
  async runBlack(filePath, check = false) {
    const args = ["black"];
    if (check) args.push("--check");
    args.push("--quiet");
    args.push(filePath);

    const result = await this.runCommand(args.join(" "));
    return {
      tool: "Black",
      file: filePath,
      success: result.success,
      check: check,
      formatted: !check,
      error: result.stderr,
    };
  }

  // PHPStan 実行
  async runPHPStan(filePath) {
    const result = await this.runCommand(
      `vendor/bin/phpstan analyse --no-progress ${filePath}`
    );
    return {
      tool: "PHPStan",
      file: filePath,
      success: result.success,
      output: result.stdout,
      error: result.stderr,
    };
  }

  // Laravel Pint 実行
  async runPint(filePath, test = false) {
    const args = ["vendor/bin/pint"];
    if (test) args.push("--test");
    args.push(filePath);

    const result = await this.runCommand(args.join(" "));
    return {
      tool: "Pint",
      file: filePath,
      success: result.success,
      test: test,
      output: result.stdout,
      error: result.stderr,
    };
  }

  // HTMLHint 実行
  async runHTMLHint(filePath) {
    const result = await this.runCommand(`npm run lint:html -- ${filePath}`);
    return {
      tool: "HTMLHint",
      file: filePath,
      success: result.success,
      output: result.stdout,
      error: result.stderr,
    };
  }

  // Linter 一覧取得
  listLinters() {
    return {
      linters: [
        {
          name: "ESLint",
          language: "JavaScript",
          command: "run_eslint",
          support: "Check & Fix",
        },
        {
          name: "Prettier",
          language: "JavaScript",
          command: "run_prettier",
          support: "Format",
        },
        {
          name: "PyLint",
          language: "Python",
          command: "run_pylint",
          support: "Check",
        },
        {
          name: "Black",
          language: "Python",
          command: "run_black",
          support: "Format",
        },
        {
          name: "PHPStan",
          language: "PHP",
          command: "run_phpstan",
          support: "Check",
        },
        {
          name: "Pint",
          language: "PHP",
          command: "run_pint",
          support: "Check & Fix",
        },
        {
          name: "HTMLHint",
          language: "HTML",
          command: "run_htmlhint",
          support: "Check",
        },
      ],
    };
  }

  // ツール実行
  async executeTool(name, args) {
    switch (name) {
      case "run_eslint":
        return await this.runESLint(args.filePath, args.fix);
      case "run_prettier":
        return await this.runPrettier(args.filePath, args.check);
      case "run_pylint":
        return await this.runPyLint(args.filePath);
      case "run_black":
        return await this.runBlack(args.filePath, args.check);
      case "run_phpstan":
        return await this.runPHPStan(args.filePath);
      case "run_pint":
        return await this.runPint(args.filePath, args.test);
      case "run_htmlhint":
        return await this.runHTMLHint(args.filePath);
      case "list_linters":
        return this.listLinters();
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}

// MCP サーバー起動
const server = new LintMCPServer();

// stdin/stdout で MCP プロトコル通信
process.stdin.on("data", async (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === "list_tools") {
    console.log(JSON.stringify({ tools: server.tools }));
  } else if (message.type === "call_tool") {
    const result = await server.executeTool(message.name, message.arguments);
    console.log(JSON.stringify(result));
  }
});

console.error("[Lint MCP Server] Initialized and ready for MCP communication");
