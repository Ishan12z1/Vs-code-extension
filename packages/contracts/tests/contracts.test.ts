import assert from "node:assert/strict";
import test from "node:test";

import {
  PlanRequestSchema,
  PlanResponseSchema,
  WorkspaceSnapshotAcceptanceRequestSchema,
  legacy,
} from "../src";

/**
 * Small helper that asserts one Zod schema accepts a payload.
 *
 * Why this helper exists:
 * - keeps the tests short and readable
 * - makes failures more obvious at the call site
 */
function expectParseSuccess<T>(
  schema: { parse: (value: unknown) => T },
  payload: unknown,
): T {
  return schema.parse(payload);
}

/**
 * Small helper that asserts one Zod schema rejects a payload.
 *
 * We do not inspect the full error tree here yet.
 * D3 only needs honest pass/fail coverage for the important contract paths.
 */
function expectParseFailure(
  schema: { parse: (value: unknown) => unknown },
  payload: unknown,
): void {
  assert.throws(() => schema.parse(payload));
}

/**
 * Shared minimal valid workspace snapshot fixture.
 *
 * Keep this realistic, but small enough that multiple tests can reuse it.
 */
function buildValidWorkspaceSnapshot() {
  return {
    workspaceFolders: [
      {
        name: "demo-workspace",
        uri: "file:///demo-workspace",
      },
    ],
    hasWorkspaceFile: false,
    vscodeFolderPresent: true,
    detectedMarkers: ["marker:package.json", "stack:jsts"],
    installedExtensions: [],
    relevantFiles: ["package.json", ".vscode/settings.json"],
    relevantUserSettings: {
      "editor.formatOnSave": true,
    },
    relevantWorkspaceSettings: {
      "prettier.requireConfig": true,
    },
    installedTargetExtensions: [
      {
        id: "esbenp.prettier-vscode",
        installed: true,
        version: "10.0.0",
        isActive: false,
      },
    ],
    keybindingSignals: [
      {
        command: "editor.action.formatDocument",
        available: true,
        keybinding: null,
        note: "Formatting command exists.",
      },
    ],
    vscodeFiles: {
      settingsJson: {
        relativePath: ".vscode/settings.json",
        exists: true,
        parseStatus: "parsed",
        parsedContent: {
          "editor.formatOnSave": true,
        },
        parseError: null,
      },
      tasksJson: {
        relativePath: ".vscode/tasks.json",
        exists: false,
        parseStatus: "not_found",
        parsedContent: null,
        parseError: null,
      },
      launchJson: {
        relativePath: ".vscode/launch.json",
        exists: false,
        parseStatus: "not_found",
        parsedContent: null,
        parseError: null,
      },
      extensionsJson: {
        relativePath: ".vscode/extensions.json",
        exists: true,
        parseStatus: "parsed",
        parsedContent: {
          recommendations: ["esbenp.prettier-vscode"],
        },
        parseError: null,
      },
    },
    notes: ["Detected likely JS/TS workspace signals."],
  };
}

/**
 * Shared minimal valid planned action fixture.
 */
function buildValidPlannedAction() {
  return {
    id: "action-1",
    actionType: "updateWorkspaceSettings",
    scope: "workspace",
    target: "editor.formatOnSave",
    parameters: {
      value: true,
    },
    riskLevel: "low",
    requiresApproval: false,
    preview: {
      summary: "Enable format on save for this workspace.",
      targetLabel: "editor.formatOnSave",
      before: false,
      after: true,
      diffText: "editor.formatOnSave: false -> true",
    },
    executionMethod: "vscode.workspace.getConfiguration().update",
    rollbackMethod: "restore_previous_setting",
  };
}

test("PlanRequestSchema accepts a valid request payload", () => {
  const payload = {
    userRequest: {
      id: "req-1",
      text: "Explain my current VS Code setup",
      requestClassHint: "explain",
      createdAt: "2026-04-10T12:00:00Z",
    },
    workspaceSnapshot: buildValidWorkspaceSnapshot(),
  };

  const parsed = expectParseSuccess(PlanRequestSchema, payload);

  assert.equal(parsed.userRequest.id, "req-1");
  assert.equal(parsed.userRequest.requestClassHint, "explain");
  assert.equal(parsed.workspaceSnapshot.workspaceFolders.length, 1);
});

test("PlanRequestSchema rejects the old created_at field name", () => {
  const payload = {
    userRequest: {
      id: "req-1",
      text: "Explain my current VS Code setup",

      // D3 specifically checks that the old drifted field name is now rejected.
      created_at: "2026-04-10T12:00:00Z",
    },
    workspaceSnapshot: buildValidWorkspaceSnapshot(),
  };

  expectParseFailure(PlanRequestSchema, payload);
});

test("PlannedActionSchema rejects an invalid action type", () => {
  const payload = {
    ...buildValidPlannedAction(),

    // This action type is intentionally invalid.
    actionType: "deleteEverything",
  };

  expectParseFailure(legacy.PlannedActionSchema, payload);
});

test("PlannedActionSchema rejects an invalid scope", () => {
  const payload = {
    ...buildValidPlannedAction(),

    // This scope is intentionally invalid.
    scope: "global",
  };

  expectParseFailure(legacy.PlannedActionSchema, payload);
});

test("PlannedActionSchema rejects an invalid preview payload", () => {
  const payload = {
    ...buildValidPlannedAction(),
    preview: {
      // summary is intentionally missing here
      targetLabel: "editor.formatOnSave",
      before: false,
      after: true,
    },
  };

  expectParseFailure(legacy.PlannedActionSchema, payload);
});

test("ExecutionPlanSchema accepts a valid execution plan", () => {
  const payload = {
    id: "plan-1",
    summary: "Enable format on save in the workspace",
    explanation: "This will update workspace settings only.",
    requestClass: "configure",
    approval: {
      required: false,
      reason: "Low-risk workspace setting update.",
      riskLevel: "low",
    },
    actions: [buildValidPlannedAction()],
  };

  const parsed = legacy.ExecutionPlanSchema.parse(payload);

  assert.equal(parsed.id, "plan-1");
  assert.equal(parsed.actions.length, 1);
  assert.equal(parsed.actions[0]?.actionType, "updateWorkspaceSettings");
});

test("ExecutionPlanSchema rejects an empty actions array", () => {
  const payload = {
    id: "plan-1",
    summary: "Enable format on save in the workspace",
    explanation: "This will update workspace settings only.",
    requestClass: "configure",
    approval: {
      required: false,
      reason: "Low-risk workspace setting update.",
      riskLevel: "low",
    },

    // The plan must contain at least one action.
    actions: [],
  };

  expectParseFailure(legacy.ExecutionPlanSchema, payload);
});

test("WorkspaceSnapshotAcceptanceRequestSchema accepts a valid payload", () => {
  const payload = {
    snapshot: buildValidWorkspaceSnapshot(),
    collectedAt: "2026-04-10T12:00:00Z",
    source: "vscode-extension",
  };

  const parsed = expectParseSuccess(
    WorkspaceSnapshotAcceptanceRequestSchema,
    payload,
  );

  assert.equal(parsed.source, "vscode-extension");
  assert.equal(parsed.snapshot.detectedMarkers.length, 2);
});

test("WorkspaceSnapshotAcceptanceRequestSchema rejects malformed snapshot shape", () => {
  const payload = {
    snapshot: {
      // workspaceFolders must be an array, not a string.
      workspaceFolders: "not-an-array",
    },
    collectedAt: "2026-04-10T12:00:00Z",
    source: "vscode-extension",
  };

  expectParseFailure(WorkspaceSnapshotAcceptanceRequestSchema, payload);
});

test("PlanResponseSchema accepts a structured error response", () => {
  const payload = {
    kind: "error",
    error: {
      code: "not_implemented",
      message: "Planning is not implemented yet.",
      details: {
        requestId: "req-123",
      },
    },
  };

  const parsed = expectParseSuccess(PlanResponseSchema, payload);

  assert.equal(parsed.kind, "error");
  if (parsed.kind === "error") {
    assert.equal(parsed.error.code, "not_implemented");
  }
});

test("PlanResponseSchema rejects an invalid error code", () => {
  const payload = {
    kind: "error",
    error: {
      code: "totally_unknown_error_code",
      message: "This should fail validation.",
    },
  };

  expectParseFailure(PlanResponseSchema, payload);
});