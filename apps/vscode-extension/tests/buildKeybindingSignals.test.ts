import assert from "node:assert/strict";
import test from "node:test";

import { buildKeybindingSignals } from "../src/inspectors/core/buildKeybindingSignals";

test("buildKeybindingSignals marks available commands and explains unresolved keybindings", () => {
  const result = buildKeybindingSignals(
    [
      {
        command: "editor.action.formatDocument",
        note: "Formatting command should exist if formatting flows are inspectable.",
      },
    ],
    new Set(["editor.action.formatDocument"]),
  );

  assert.equal(result.keybindingSignals.length, 1);
  assert.equal(result.keybindingSignals[0]?.available, true);
  assert.equal(result.keybindingSignals[0]?.keybinding, null);
  assert.equal(
    result.keybindingSignals[0]?.note?.includes("binding remains unresolved"),
    true,
  );
  assert.equal(
    result.notes.some((note) => note.includes("stable public API")),
    true,
  );
});

test("buildKeybindingSignals marks unavailable commands and explains why that matters", () => {
  const result = buildKeybindingSignals(
    [
      {
        command: "workbench.action.debug.start",
        note: "Debug start command is relevant to launch/debug diagnosis.",
      },
    ],
    new Set(),
  );

  assert.equal(result.keybindingSignals.length, 1);
  assert.equal(result.keybindingSignals[0]?.available, false);
  assert.equal(
    result.keybindingSignals[0]?.note?.includes("not currently available"),
    true,
  );
  assert.equal(
    result.notes.some((note) => note.includes("unavailable")),
    true,
  );
});