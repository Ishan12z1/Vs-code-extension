import assert from "node:assert/strict";
import test from "node:test";

import type { VscodeFileInspection } from "@control-agent/contracts";
import {
  aggregateManagedVscodeFileInspections,
  type FolderManagedVscodeFileInspection,
} from "../src/inspectors/core/aggregateManagedVscodeFileInspections";

/**
 * Small helper to build one folder-tied managed file inspection for tests.
 */
function buildEntry(options: {
  folderName: string;
  workspaceRelativePath: string;
  inspection: VscodeFileInspection;
}): FolderManagedVscodeFileInspection {
  return {
    folderName: options.folderName,
    workspaceRelativePath: options.workspaceRelativePath,
    inspection: options.inspection,
  };
}

test("aggregateManagedVscodeFileInspections prefers a parsed copy over invalid copies", () => {
  const result = aggregateManagedVscodeFileInspections(".vscode/settings.json", [
    buildEntry({
      folderName: "backend",
      workspaceRelativePath: "backend/.vscode/settings.json",
      inspection: {
        relativePath: ".vscode/settings.json",
        exists: true,
        parseStatus: "invalid_jsonc",
        parsedContent: null,
        parseError: "Trailing comma.",
      },
    }),
    buildEntry({
      folderName: "frontend",
      workspaceRelativePath: "frontend/.vscode/settings.json",
      inspection: {
        relativePath: ".vscode/settings.json",
        exists: true,
        parseStatus: "parsed",
        parsedContent: {
          "editor.formatOnSave": true,
        },
        parseError: null,
      },
    }),
  ]);

  assert.equal(result.inspection.parseStatus, "parsed");
  assert.deepEqual(result.inspection.parsedContent, {
    "editor.formatOnSave": true,
  });
  assert.equal(result.relevantFiles.length, 2);
  assert.equal(result.notes.some((note) => note.includes("Multi-root workspace")), true);
});

test("aggregateManagedVscodeFileInspections returns invalid_jsonc when no parsed copy exists", () => {
  const result = aggregateManagedVscodeFileInspections(".vscode/tasks.json", [
    buildEntry({
      folderName: "backend",
      workspaceRelativePath: "backend/.vscode/tasks.json",
      inspection: {
        relativePath: ".vscode/tasks.json",
        exists: true,
        parseStatus: "invalid_jsonc",
        parsedContent: null,
        parseError: "Unexpected token.",
      },
    }),
  ]);

  assert.equal(result.inspection.parseStatus, "invalid_jsonc");
  assert.equal(result.inspection.parseError, "Unexpected token.");
  assert.deepEqual(result.relevantFiles, ["backend/.vscode/tasks.json"]);
});

test("aggregateManagedVscodeFileInspections returns not_found when the file does not exist anywhere", () => {
  const result = aggregateManagedVscodeFileInspections(".vscode/launch.json", [
    buildEntry({
      folderName: "backend",
      workspaceRelativePath: "backend/.vscode/launch.json",
      inspection: {
        relativePath: ".vscode/launch.json",
        exists: false,
        parseStatus: "not_found",
        parsedContent: null,
        parseError: null,
      },
    }),
    buildEntry({
      folderName: "frontend",
      workspaceRelativePath: "frontend/.vscode/launch.json",
      inspection: {
        relativePath: ".vscode/launch.json",
        exists: false,
        parseStatus: "not_found",
        parsedContent: null,
        parseError: null,
      },
    }),
  ]);

  assert.equal(result.inspection.exists, false);
  assert.equal(result.inspection.parseStatus, "not_found");
  assert.equal(result.relevantFiles.length, 0);
});