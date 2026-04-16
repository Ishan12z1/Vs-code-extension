import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";
import { buildTaskAndDebugNotes } from "../src/inspectors/core/buildTaskAndDebugNotes";

test("buildTaskAndDebugNotes reports detected tasks and debug configurations", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  snapshot.vscodeFiles.tasksJson = {
    relativePath: ".vscode/tasks.json",
    exists: true,
    parseStatus: "parsed",
    parsedContent: {
      version: "2.0.0",
      tasks: [{ label: "build" }, { label: "test" }],
      inputs: [{ id: "pickEnv" }],
    },
    parseError: null,
  };

  snapshot.vscodeFiles.launchJson = {
    relativePath: ".vscode/launch.json",
    exists: true,
    parseStatus: "parsed",
    parsedContent: {
      version: "0.2.0",
      configurations: [{ name: "Run app" }],
      compounds: [{ name: "All" }],
    },
    parseError: null,
  };

  const notes = buildTaskAndDebugNotes(snapshot.vscodeFiles);

  assert.equal(
    notes.includes("Detected 2 task definition(s) in .vscode/tasks.json."),
    true,
  );
  assert.equal(
    notes.includes("Detected 1 debug configuration(s) in .vscode/launch.json."),
    true,
  );
  assert.equal(
    notes.includes("Detected 1 task input definition(s) in .vscode/tasks.json."),
    true,
  );
  assert.equal(
    notes.includes("Detected 1 launch compound definition(s) in .vscode/launch.json."),
    true,
  );
});

test("buildTaskAndDebugNotes reports missing tasks.json and launch.json clearly", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  const notes = buildTaskAndDebugNotes(snapshot.vscodeFiles);

  assert.equal(
    notes.includes(
      "No .vscode/tasks.json file was detected in the current workspace context.",
    ),
    true,
  );
  assert.equal(
    notes.includes(
      "No .vscode/launch.json file was detected in the current workspace context.",
    ),
    true,
  );
});