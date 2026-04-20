import assert from "node:assert/strict";
import test from "node:test";

import {
  ActionPreviewSchema,
  SurfaceActionSchema,
  SurfaceNameSchema,
  SurfaceStateSchema,
  VerificationResultSchema,
} from "../src/surfaces";
import {
  ApprovalDecisionRecordSchema,
  ApprovalRequestSchema,
  PolicyDecisionSchema,
  RiskLevelSchema,
} from "../src/policy";

test("SurfaceNameSchema accepts supported V1 surfaces", () => {
  assert.equal(SurfaceNameSchema.parse("userSettings"), "userSettings");
  assert.equal(SurfaceNameSchema.parse("workspaceSettings"), "workspaceSettings");
  assert.equal(SurfaceNameSchema.parse("keybindings"), "keybindings");
  assert.equal(SurfaceNameSchema.parse("extensionsLifecycle"), "extensionsLifecycle");
  assert.equal(SurfaceNameSchema.parse("tasksJson"), "tasksJson");
  assert.equal(SurfaceNameSchema.parse("launchJson"), "launchJson");
});

test("SurfaceActionSchema parses a valid surface action", () => {
  const parsed = SurfaceActionSchema.parse({
    actionId: "action-1",
    surface: "workspaceSettings",
    operation: "set",
    target: "editor.formatOnSave",
    params: {
      value: true,
    },
  });

  assert.equal(parsed.surface, "workspaceSettings");
  assert.equal(parsed.operation, "set");
});

test("SurfaceStateSchema parses a valid surface state", () => {
  const parsed = SurfaceStateSchema.parse({
    surface: "tasksJson",
    target: ".vscode/tasks.json",
    exists: true,
    data: {
      version: "2.0.0",
    },
    metadata: {
      parseStatus: "parsed",
    },
    collectedAt: "2026-04-20T12:20:00.000Z",
  });

  assert.equal(parsed.surface, "tasksJson");
  assert.equal(parsed.exists, true);
});

test("ActionPreviewSchema parses a preview payload", () => {
  const parsed = ActionPreviewSchema.parse({
    summary: "Enable format on save.",
    targetLabel: "Workspace setting: editor.formatOnSave",
    before: false,
    after: true,
    diffText: "- false\n+ true",
    warnings: [],
  });

  assert.equal(parsed.targetLabel, "Workspace setting: editor.formatOnSave");
});

test("VerificationResultSchema parses a verification result", () => {
  const parsed = VerificationResultSchema.parse({
    surface: "launchJson",
    status: "verified",
    success: true,
    message: "launch.json contains the expected Node debug configuration.",
    details: {
      configName: "Launch Program",
    },
    warnings: [],
    verifiedAt: "2026-04-20T12:25:00.000Z",
  });

  assert.equal(parsed.status, "verified");
  assert.equal(parsed.success, true);
});

test("RiskLevelSchema accepts supported levels", () => {
  assert.equal(RiskLevelSchema.parse("low"), "low");
  assert.equal(RiskLevelSchema.parse("medium"), "medium");
  assert.equal(RiskLevelSchema.parse("high"), "high");
});

test("ApprovalRequestSchema parses a valid approval request", () => {
  const parsed = ApprovalRequestSchema.parse({
    requestId: "approval-1",
    runId: "run-1",
    toolName: "patch_launch_json",
    targetLabel: ".vscode/launch.json",
    riskLevel: "medium",
    reason: "This changes debug behavior for the workspace.",
    previewSummary: "Add a Node launch configuration.",
    createdAt: "2026-04-20T12:30:00.000Z",
  });

  assert.equal(parsed.riskLevel, "medium");
  assert.equal(parsed.toolName, "patch_launch_json");
});

test("ApprovalDecisionRecordSchema parses a valid approval record", () => {
  const parsed = ApprovalDecisionRecordSchema.parse({
    requestId: "approval-1",
    runId: "run-1",
    decision: "approved",
    reason: "Looks correct.",
    decidedAt: "2026-04-20T12:31:00.000Z",
  });

  assert.equal(parsed.decision, "approved");
});

test("PolicyDecisionSchema parses allow, requireApproval, and block outcomes", () => {
  assert.equal(
    PolicyDecisionSchema.parse({
      outcome: "allow",
      riskLevel: "low",
      reason: "Read-only inspection tool.",
    }).outcome,
    "allow",
  );

  assert.equal(
    PolicyDecisionSchema.parse({
      outcome: "requireApproval",
      riskLevel: "medium",
      reason: "Workspace write requires approval.",
    }).outcome,
    "requireApproval",
  );

  assert.equal(
    PolicyDecisionSchema.parse({
      outcome: "block",
      riskLevel: "high",
      reason: "Unsupported operation.",
    }).outcome,
    "block",
  );
});