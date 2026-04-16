import assert from "node:assert/strict";
import test from "node:test";

import { buildWorkspaceSummaryViewModel } from "../src/explain/buildWorkspaceSummaryViewModel";
import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";

test("buildWorkspaceSummaryViewModel handles no workspace open cleanly", () => {
  /**
   * This covers the no-workspace-open edge case.
   * The summary should stay stable and user-readable even when nothing is open.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  const summary = buildWorkspaceSummaryViewModel(snapshot);

  assert.equal(summary.subtitle.includes("No workspace folder open"), true);

  const overviewSection = summary.sections.find(
    (section) => section.title === "Overview",
  );

  assert.ok(overviewSection);
  assert.equal(
    overviewSection?.items.some(
      (item) => item.label === "Workspace folders" && item.value === "None",
    ),
    true,
  );
});

test("buildWorkspaceSummaryViewModel shows missing managed files clearly", () => {
  /**
   * This covers the missing-files edge case.
   * The summary should show that the managed .vscode/* files are absent,
   * not silently omit them.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  const summary = buildWorkspaceSummaryViewModel(snapshot);
  const vscodeFilesSection = summary.sections.find(
    (section) => section.title === ".vscode files",
  );

  assert.ok(vscodeFilesSection);
  assert.equal(vscodeFilesSection?.items.length, 4);
  assert.equal(
    vscodeFilesSection?.items.every((item) => item.value === "Not found"),
    true,
  );
});