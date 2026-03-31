/**
 * lint-staged config for fast pre-commit checks.
 *
 * Rules:
 * - TypeScript files get ESLint autofix first, then Prettier.
 * - JSON / Markdown / YAML just get Prettier.
 * - Python files get Ruff autofix + formatting.
 *
 * Keep pre-commit fast.
 * Do not run full test suites here.
 */
module.exports = {
  // VS Code extension source files.
  "apps/vscode-extension/src/**/*.ts": ["eslint --fix", "prettier --write"],

  // MCP service source files.
  "apps/mcp-recipes/src/**/*.ts": ["eslint --fix", "prettier --write"],

  // Shared contracts source files.
  "packages/contracts/src/**/*.ts": ["eslint --fix", "prettier --write"],

  // Python API files.
  "apps/api/**/*.py": ["python -m ruff check --fix", "python -m ruff format"],

  // Shared config/content files.
  "*.{json,md,yml,yaml}": ["prettier --write"]
};