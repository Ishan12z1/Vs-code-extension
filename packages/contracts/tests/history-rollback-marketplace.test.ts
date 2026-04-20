import assert from "node:assert/strict";
import test from "node:test";

import {
  RunHistoryEntrySchema,
  TraceEventSchema,
} from "../src/history";
import {
  RollbackRequestSchema,
  RollbackSnapshotSchema,
} from "../src/rollback";
import {
  MarketplaceExtensionSchema,
  MarketplaceQuerySchema,
  MarketplaceSearchResultSchema,
} from "../src/marketplace";

test("TraceEventSchema parses a valid trace event", () => {
  const parsed = TraceEventSchema.parse({
    eventId: "event-1",
    runId: "run-1",
    type: "tool.started",
    message: "Started inspect_workspace_settings.",
    data: {
      toolName: "inspect_workspace_settings",
    },
    createdAt: "2026-04-20T12:40:00.000Z",
  });

  assert.equal(parsed.type, "tool.started");
});

test("RunHistoryEntrySchema parses a valid history entry", () => {
  const parsed = RunHistoryEntrySchema.parse({
    runId: "run-1",
    goalText: "Enable ESLint and format on save",
    status: "completed",
    stepCount: 4,
    approvalCount: 1,
    startedAt: "2026-04-20T12:00:00.000Z",
    completedAt: "2026-04-20T12:45:00.000Z",
    summary: "Updated workspace settings and verified the result.",
  });

  assert.equal(parsed.status, "completed");
  assert.equal(parsed.stepCount, 4);
});

test("RollbackSnapshotSchema parses a valid rollback snapshot", () => {
  const parsed = RollbackSnapshotSchema.parse({
    snapshotId: "snapshot-1",
    runId: "run-1",
    stepIndex: 2,
    surface: "workspaceSettings",
    target: ".vscode/settings.json",
    actionOperation: "set",
    snapshotKind: "before-write",
    snapshotData: {
      editor: {
        formatOnSave: false,
      },
    },
    createdAt: "2026-04-20T12:15:00.000Z",
  });

  assert.equal(parsed.surface, "workspaceSettings");
  assert.equal(parsed.snapshotKind, "before-write");
});

test("RollbackRequestSchema parses a valid rollback request", () => {
  const parsed = RollbackRequestSchema.parse({
    runId: "run-1",
    scope: "latestRun",
    reason: "Undo the previous workspace configuration changes.",
    requestedAt: "2026-04-20T12:50:00.000Z",
  });

  assert.equal(parsed.scope, "latestRun");
});

test("MarketplaceQuerySchema parses a valid marketplace query", () => {
  const parsed = MarketplaceQuerySchema.parse({
    query: "python formatter",
    limit: 5,
    includePrerelease: false,
  });

  assert.equal(parsed.limit, 5);
});

test("MarketplaceExtensionSchema parses a valid marketplace extension", () => {
  const parsed = MarketplaceExtensionSchema.parse({
    extensionId: "ms-python.python",
    publisher: "ms-python",
    name: "python",
    displayName: "Python",
    description: "Python support for Visual Studio Code",
    version: "2026.4.0",
    installs: 1000000,
    rating: 4.5,
    tags: ["python", "linting", "debugging"],
  });

  assert.equal(parsed.extensionId, "ms-python.python");
  assert.equal(parsed.publisher, "ms-python");
});

test("MarketplaceSearchResultSchema parses a valid result payload", () => {
  const parsed = MarketplaceSearchResultSchema.parse({
    query: {
      query: "node debugger",
      limit: 3,
      includePrerelease: false,
    },
    results: [
      {
        extensionId: "ms-vscode.js-debug",
        publisher: "ms-vscode",
        name: "js-debug",
        displayName: "JavaScript Debugger",
        tags: ["debugging"],
      },
    ],
    fetchedAt: "2026-04-20T12:55:00.000Z",
  });

  assert.equal(parsed.results.length, 1);
});