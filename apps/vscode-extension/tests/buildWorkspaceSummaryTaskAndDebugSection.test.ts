import assert from "node:assert/strict";
import test from "node:test";

import { buildWorkspaceSummaryViewModel } from "../src/explain/buildWorkspaceSummaryViewModel";
import { createEmptyWorkspaceSnapshot } from "../src/inspectors/createEmptyWorkspaceSnapshot";

test("buildWorkspaceSummaryViewModel includes a Tasks and debug section", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  snapshot.vscodeFiles.tasksJson = {
    relativePath: ".vscode/tasks.json",
    exists: true,
    parseStatus: "parsed",
    parsedContent: {
      tasks: [{ label: "build" }],
    },
    parseError: null,
  };

  snapshot.vscodeFiles.launchJson = {
    relativePath: ".vscode/launch.json",
    exists: true,
    parseStatus: "parsed",
    parsedContent: {
      configurations: [{ name: "Run app" }, { name: "Debug tests" }],
    },
    parseError: null,
  };

  const summary = buildWorkspaceSummaryViewModel(snapshot);
  const section = summary.sections.find(
    (item) => item.title === "Tasks and debug",
  );

  assert.ok(section);
  assert.equal(section?.items.length, 2);
  assert.equal(
    section?.items.some(
      (item) =>
        item.label === "tasks.json" &&
        item.value.includes("1 task definition"),
    ),
    true,
  );
  assert.equal(
    section?.items.some(
      (item) =>
        item.label === "launch.json" &&
        item.value.includes("2 debug configuration"),
    ),
    true,
  );
});

test("buildWorkspaceSummaryViewModel shows missing task/debug files clearly", () => {
  const snapshot = createEmptyWorkspaceSnapshot();

  const summary = buildWorkspaceSummaryViewModel(snapshot);
  const section = summary.sections.find(
    (item) => item.title === "Tasks and debug",
  );

  assert.ok(section);
  assert.equal(section?.items[0]?.value, "Not found");
  assert.equal(section?.items[1]?.value, "Not found");
});