import assert from "node:assert/strict";
import test from "node:test";

import {
  AgentGoalSchema,
  AgentRunStateSchema,
  RunCheckpointSchema,
  RunStatusSchema,
  RunSummarySchema,
} from "../src/runtime";

test("RunStatusSchema accepts supported runtime states", () => {
  assert.equal(RunStatusSchema.parse("idle"), "idle");
  assert.equal(RunStatusSchema.parse("running"), "running");
  assert.equal(RunStatusSchema.parse("waitingApproval"), "waitingApproval");
  assert.equal(RunStatusSchema.parse("blocked"), "blocked");
  assert.equal(RunStatusSchema.parse("completed"), "completed");
  assert.equal(RunStatusSchema.parse("failed"), "failed");
  assert.equal(RunStatusSchema.parse("cancelled"), "cancelled");
});

test("AgentGoalSchema parses a valid goal", () => {
  const parsed = AgentGoalSchema.parse({
    id: "goal-1",
    text: "Set up Python tooling in VS Code",
    createdAt: "2026-04-20T12:00:00.000Z",
    requestClassHint: "configure",
  });

  assert.equal(parsed.id, "goal-1");
  assert.equal(parsed.requestClassHint, "configure");
});

test("RunCheckpointSchema parses a valid checkpoint", () => {
  const parsed = RunCheckpointSchema.parse({
    checkpointId: "cp-1",
    runId: "run-1",
    stepIndex: 1,
    status: "running",
    activeSurface: "workspaceSettings",
    note: "Collected initial workspace settings.",
    context: {
      workspaceFolderCount: 1,
    },
    createdAt: "2026-04-20T12:01:00.000Z",
  });

  assert.equal(parsed.status, "running");
  assert.equal(parsed.activeSurface, "workspaceSettings");
});

test("RunSummarySchema parses a valid summary", () => {
  const parsed = RunSummarySchema.parse({
    runId: "run-1",
    goalText: "Enable format on save",
    status: "completed",
    totalSteps: 3,
    approvalsUsed: 1,
    rollbackAvailable: true,
    summary: "Enabled format on save and verified the result.",
    warnings: [],
    completedAt: "2026-04-20T12:05:00.000Z",
  });

  assert.equal(parsed.rollbackAvailable, true);
  assert.equal(parsed.totalSteps, 3);
});

test("AgentRunStateSchema parses a valid runtime state", () => {
  const parsed = AgentRunStateSchema.parse({
    runId: "run-1",
    goal: {
      id: "goal-1",
      text: "Configure format on save for the workspace",
      createdAt: "2026-04-20T12:00:00.000Z",
      requestClassHint: "configure",
    },
    status: "running",
    currentStep: 1,
    maxSteps: 10,
    activeSurface: "workspaceSettings",
    context: {
      workspaceName: "demo",
    },
    history: [],
    approvals: [],
    checkpoints: [],
    snapshots: [],
    startedAt: "2026-04-20T12:00:00.000Z",
    updatedAt: "2026-04-20T12:02:00.000Z",
  });

  assert.equal(parsed.status, "running");
  assert.equal(parsed.goal.text, "Configure format on save for the workspace");
});

test("AgentRunStateSchema rejects invalid maxSteps", () => {
  assert.throws(() => {
    AgentRunStateSchema.parse({
      runId: "run-1",
      goal: {
        id: "goal-1",
        text: "Do something",
        createdAt: "2026-04-20T12:00:00.000Z",
      },
      status: "running",
      currentStep: 0,
      maxSteps: 0,
      context: {},
      history: [],
      approvals: [],
      checkpoints: [],
      snapshots: [],
      startedAt: "2026-04-20T12:00:00.000Z",
      updatedAt: "2026-04-20T12:00:00.000Z",
    });
  });
});