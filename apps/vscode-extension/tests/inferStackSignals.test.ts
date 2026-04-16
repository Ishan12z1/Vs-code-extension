import assert from "node:assert/strict";
import test from "node:test";

import { inferStackSignals } from "../src/inspectors/core/stackMarkers";

test("inferStackSignals detects mixed Python and JS/TS signals", () => {
  /**
   * This is one of the main E5 edge cases:
   * a workspace can legitimately contain both Python and JS/TS markers.
   */
  const result = inferStackSignals(
    new Set([
      "pyprojectToml",
      "tsconfigJson",
      "eslintConfig",
    ]),
  );

  assert.equal(result.detectedMarkers.includes("stack:python"), true);
  assert.equal(result.detectedMarkers.includes("stack:jsts"), true);
  assert.equal(result.detectedMarkers.includes("tool:eslint"), true);
});

test("inferStackSignals treats package.json alone as a weak JS/TS signal", () => {
  /**
   * package.json alone should not be treated as strong JS/TS evidence.
   */
  const result = inferStackSignals(
    new Set([
      "packageJson",
    ]),
  );

  assert.equal(result.detectedMarkers.includes("stack:jsts:weak"), true);
  assert.equal(result.detectedMarkers.includes("stack:jsts"), false);
});

test("inferStackSignals recognizes tsconfigJson as strong JS/TS evidence", () => {
  /**
   * This directly guards the E5 production bug fix.
   * If the internal marker id drifts again, this test will catch it.
   */
  const result = inferStackSignals(
    new Set([
      "tsconfigJson",
    ]),
  );

  assert.equal(result.detectedMarkers.includes("stack:jsts"), true);
  assert.equal(
    result.notes.some((note) => note.includes("JS/TS workspace signals")),
    true,
  );
});