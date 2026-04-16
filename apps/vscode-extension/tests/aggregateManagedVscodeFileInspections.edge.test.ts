import assert from "node:assert/strict";
import test from "node:test";

import type { VscodeFileInspection } from "@control-agent/contracts";
import {
  aggregateManagedVscodeFileInspections,
  type FolderManagedVscodeFileInspection,
} from "../src/inspectors/core/aggregateManagedVscodeFileInspections";

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

test("aggregateManagedVscodeFileInspections records multi-root ambiguity when several parsed copies exist", () => {
  /**
   * This covers the multi-root edge case where more than one workspace folder
   * contains the same managed .vscode/* file and all copies parse successfully.
   */
  const result = aggregateManagedVscodeFileInspections(".vscode/settings.json", [
    buildEntry({
      folderName: "backend",
      workspaceRelativePath: "backend/.vscode/settings.json",
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
    buildEntry({
      folderName: "frontend",
      workspaceRelativePath: "frontend/.vscode/settings.json",
      inspection: {
        relativePath: ".vscode/settings.json",
        exists: true,
        parseStatus: "parsed",
        parsedContent: {
          "editor.formatOnSave": false,
        },
        parseError: null,
      },
    }),
  ]);

  assert.equal(result.inspection.parseStatus, "parsed");
  assert.equal(result.relevantFiles.length, 2);
  assert.equal(
    result.notes.some((note) => note.includes("multiple parsed copies")),
    true,
  );
  assert.equal(
    result.notes.some((note) => note.includes("Multi-root workspace")),
    true,
  );
});