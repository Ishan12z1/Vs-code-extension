import assert from "node:assert/strict";
import test from "node:test";

import * as contracts from "../src/index";

test("root contracts exports expose runtime-first schemas", () => {
  assert.equal(typeof contracts.AgentRunStateSchema, "object");
  assert.equal(typeof contracts.ToolCallRequestSchema, "object");
  assert.equal(typeof contracts.SurfaceActionSchema, "object");
  assert.equal(typeof contracts.PolicyDecisionSchema, "object");
  assert.equal(typeof contracts.RollbackSnapshotSchema, "object");
  assert.equal(typeof contracts.MarketplaceSearchResultSchema, "object");
});

test("root contracts exports expose the legacy namespace", () => {
  assert.equal(typeof contracts.legacy, "object");
  assert.equal(typeof contracts.legacy.ExecutionPlanSchema, "object");
  assert.equal(typeof contracts.legacy.PlannedActionSchema, "object");
  assert.equal(typeof contracts.legacy.RiskLevelSchema, "object");
});

test("root contracts exports still expose transitional request/api contracts", () => {
  assert.equal(typeof contracts.UserRequestSchema, "object");
  assert.equal(typeof contracts.WorkspaceSnapshotSchema, "object");
  assert.equal(typeof contracts.PlanRequestSchema, "object");
  assert.equal(typeof contracts.PlanResponseSchema, "object");
});