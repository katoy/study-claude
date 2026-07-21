# 汎用 Lint MCP サーバー

複数言語・ツールに対応した Lint/Format MCP サーバーです。

## 機能

このサーバーは以下の Linter/Formatter に対応しています：

### JavaScript
- **ESLint** - コード品質チェック＆自動修正
- **Prettier** - コードフォーマット

### Python
- **PyLint** - コード品質チェック
- **Black** - コードフォーマット

### PHP
- **PHPStan** - 静的解析
- **Laravel Pint** - コードフォーマット（Laravel Pint）

### HTML
- **HTMLHint** - HTML コード品質チェック

## インストール

```bash
# MCP 設定ファイルに以下を追加：
{
  "lint-mcp": {
    "command": "node",
    "args": ["/path/to/tools/lint-mcp/server.js"]
  }
}
```

## 使用方法

### MCP ツール一覧

```
- run_eslint       : ESLint でコード品質チェック＆修正
- run_prettier     : Prettier でコードをフォーマット
- run_pylint       : PyLint でコード品質チェック
- run_black        : Black でコードをフォーマット
- run_phpstan      : PHPStan で静的解析
- run_pint         : Laravel Pint でコードをフォーマット
- run_htmlhint     : HTMLHint で HTML チェック
- list_linters     : 利用可能な Linter 一覧を取得
```

### 各ツールの使用例

#### ESLint
```json
{
  "name": "run_eslint",
  "arguments": {
    "filePath": "src/app.js",
    "fix": true
  }
}
```

#### Prettier
```json
{
  "name": "run_prettier",
  "arguments": {
    "filePath": "src/app.js",
    "check": false
  }
}
```

#### PyLint
```json
{
  "name": "run_pylint",
  "arguments": {
    "filePath": "src/main.py"
  }
}
```

#### Black
```json
{
  "name": "run_black",
  "arguments": {
    "filePath": "src/main.py",
    "check": false
  }
}
```

#### PHPStan
```json
{
  "name": "run_phpstan",
  "arguments": {
    "filePath": "src/User.php"
  }
}
```

#### Laravel Pint
```json
{
  "name": "run_pint",
  "arguments": {
    "filePath": "src/User.php",
    "test": false
  }
}
```

#### HTMLHint
```json
{
  "name": "run_htmlhint",
  "arguments": {
    "filePath": "index.html"
  }
}
```

#### Linter 一覧取得
```json
{
  "name": "list_linters",
  "arguments": {}
}
```

## 必要な環境

各 Linter がシステムにインストールされている必要があります：

```bash
# JavaScript
npm install -g eslint prettier

# Python
pip install pylint black

# PHP
composer require --dev phpstan phpstan/phpstan laravel/pint

# HTML
npm install -g htmlhint
```

## 設定ファイル

各ツールの設定は対応する設定ファイルで管理されます：

- ESLint: `.eslintrc.js`, `.eslintrc.json`, `eslint.config.js`
- Prettier: `.prettierrc`, `prettier.config.js`
- PyLint: `.pylintrc`, `pylintrc`
- Black: `pyproject.toml`, `.black`
- PHPStan: `phpstan.neon`, `phpstan.neon.dist`
- Pint: `pint.json`
- HTMLHint: `.htmlhintrc`

## トラブルシューティング

### "command not found: eslint"
```bash
npm install -g eslint
```

### "ModuleNotFoundError: No module named 'pylint'"
```bash
pip install pylint
```

### "command not found: phpstan"
```bash
composer require --dev phpstan
```

## ライセンス

MIT

## 備考

- このサーバーは MCP（Model Context Protocol）に準拠しています
- 各ツールのバージョンは個別にインストール・更新してください
- JSON 形式でのレスポンスは各ツールの出力に基づいています
