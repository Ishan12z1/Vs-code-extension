import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";
import { buildWorkspaceSummaryViewModel } from "../src/explain/buildWorkspaceSummaryViewModel";

test("buildWorkspaceSummaryViewModel surfaces keybinding notes in the command section", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  snapshot.keybindingSignals = [
    {
      command: "editor.action.formatDocument",
      available: true,
      keybinding: null,
      note: "Command is available, but the effective current keybinding is unresolved.",
    },
  ];

  const summary = buildWorkspaceSummaryViewModel(snapshot);
  const commandSection = summary.sections.find(
    (section) => section.title === "Relevant command availability",
  );

  assert.ok(commandSection);
  assert.equal(commandSection?.items.length, 1);
  assert.equal(
    commandSection?.items[0]?.value.includes("keybinding unresolved"),
    true,
  );
  assert.equal(
    commandSection?.items[0]?.value.includes("effective current keybinding"),
    true,
  );
});

test("buildWorkspaceSummaryViewModel surfaces unavailable commands clearly", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  snapshot.keybindingSignals = [
    {
      command: "workbench.action.debug.start",
      available: false,
      keybinding: null,
      note: "Command is not currently available; the related feature or extension may be missing.",
    },
  ];

  const summary = buildWorkspaceSummaryViewModel(snapshot);
  const commandSection = summary.sections.find(
    (section) => section.title === "Relevant command availability",
  );

  assert.ok(commandSection);
  assert.equal(commandSection?.items[0]?.value.startsWith("Unavailable"), true);
});