import assert from "node:assert/strict";
import test from "node:test";

import { parseJsonc } from "../src/inspectors/fs/parseJsonc";

test("parseJsonc accepts valid JSONC with comments and trailing commas", () => {
  /**
   * This covers one of the core E5 edge cases:
   * VS Code config files often use comments and trailing commas,
   * so the parser must accept that shape.
   */
  const input = `
    {
      // comment
      "editor.formatOnSave": true,
    }
  `;

  const result = parseJsonc(input);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    "editor.formatOnSave": true,
  });
  assert.equal(result.error, null);
});

test("parseJsonc returns a normalized error for invalid JSONC", () => {
  /**
   * This is the invalid-JSONC regression check.
   * The parser should fail cleanly and provide one useful error string.
   */
  const input = `
    {
      "editor.formatOnSave":
    }
  `;

  const result = parseJsonc(input);

  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.equal(typeof result.error, "string");
  assert.equal(result.error?.includes("JSONC parse error"), true);
});