import assert from "node:assert/strict";
import test from "node:test";

import { buildWorkspaceSummaryViewModel } from "../src/explain/buildWorkspaceSummaryViewModel";
import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";

test("final explain artifact stays aligned with the hardened snapshot shape", () => {
  /**
   * E6 does not need a full VS Code host test just to verify the final explain
   * artifact shape.
   *
   * This guards the last step of the pipeline:
   * hardened snapshot -> final summary model used by the real sidebar explain UI.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  snapshot.workspaceFolders = [
    {
      name: "demo-workspace",
      uri: "file:///demo-workspace",
    },
  ];
  snapshot.detectedMarkers = ["stack:jsts", "tool:prettier"];
  snapshot.vscodeFolderPresent = true;

  const explanation = buildWorkspaceSummaryViewModel(snapshot);

  assert.equal(explanation.title, "Current VS Code setup");
  assert.equal(explanation.subtitle.includes("1 workspace folder"), true);
  assert.equal(
    explanation.sections.some((section) => section.title === ".vscode files"),
    true,
  );
  assert.equal(
    explanation.sections.some((section) => section.title === "Tasks and debug"),
    true,
  );
});