import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Root ESLint flat config for all typescript packages.
 *
 * We only target TS workspaces here :
 * - apps/vscode-extension
 * - apps/mcp-recipes
 * - packages/contracts
 */

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.venv/**",
      "**/.vscode-test/**",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: [
      "src/**/*.ts",
      "apps/vscode-extension/src/**/*.ts",
      "apps/mcp-recipes/src/**/*.ts",
      "packages/contracts/src/**/*.ts",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      /**
       * Keep the first pass strict enough to be useful,
       * but not so strict that it turns setup into a fight.
       */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
