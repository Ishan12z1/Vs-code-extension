import assert from "node:assert/strict";
import test from "node:test";

import { WorkspaceSnapshotSchema } from "@control-agent/contracts";
import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";

test("createEmptyWorkspaceSnapshot returns the finalized shared shape", () => {
  /**
   * This is the main E1 regression check.
   *
   * We want the extension-side default snapshot to match the finalized
   * contracts package exactly, especially around .vscode/* file inspection
   * payload field names.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  // If this parse fails, the extension snapshot seed has drifted away from
  // the shared contract.
  const parsed = WorkspaceSnapshotSchema.parse(snapshot);

  assert.equal(parsed.workspaceFolders.length, 0);
  assert.equal(parsed.vscodeFiles.settingsJson.parseStatus, "not_found");
  assert.equal(parsed.vscodeFiles.settingsJson.parsedContent, null);
  assert.equal(parsed.vscodeFiles.tasksJson.parsedContent, null);
  assert.equal(parsed.vscodeFiles.launchJson.parsedContent, null);
  assert.equal(parsed.vscodeFiles.extensionsJson.parsedContent, null);
});

test("createEmptyWorkspaceSnapshot does not expose the old json field", () => {
  /**
   * This check is intentionally direct.
   *
   * Even if the shared schema changes later, we do not want the extension
   * code to quietly keep emitting the old field name.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  const settingsInspection = snapshot.vscodeFiles.settingsJson as Record<
    string,
    unknown
  >;

  assert.equal("json" in settingsInspection, false);
  assert.equal("parsedContent" in settingsInspection, true);
});

test("all empty .vscode file entries use the expected relative paths", () => {
  /**
   * This is a small sanity test that the default shape remains predictable.
   */
  const snapshot = createEmptyWorkspaceSnapshot();

  assert.equal(
    snapshot.vscodeFiles.settingsJson.relativePath,
    ".vscode/settings.json",
  );
  assert.equal(
    snapshot.vscodeFiles.tasksJson.relativePath,
    ".vscode/tasks.json",
  );
  assert.equal(
    snapshot.vscodeFiles.launchJson.relativePath,
    ".vscode/launch.json",
  );
  assert.equal(
    snapshot.vscodeFiles.extensionsJson.relativePath,
    ".vscode/extensions.json",
  );
});