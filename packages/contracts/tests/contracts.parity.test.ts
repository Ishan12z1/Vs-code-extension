import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  PlanRequestSchema,
  WorkspaceSnapshotAcceptanceRequestSchema,
  legacy,
} from "../src";

/**
 * Loads one shared JSON fixture from the repo-level contract-fixtures directory.
 *
 * Important:
 * - process.cwd() is the package root when npm runs this script
 * - that lets us resolve the shared fixtures cleanly from the contracts package
 */
function loadFixture(name: string): unknown {
  const fixturePath = resolve(process.cwd(), "..", "..", "contract-fixtures", name);
  const raw = readFileSync(fixturePath, "utf-8");
  return JSON.parse(raw);
}

test("TS parity: valid plan request fixture is accepted", () => {
  const payload = loadFixture("valid-plan-request.json");
  const parsed = PlanRequestSchema.parse(payload);

  assert.equal(parsed.userRequest.id, "req-1");
});

test("TS parity: invalid plan request fixture is rejected", () => {
  const payload = loadFixture("invalid-plan-request-created_at.json");

  assert.throws(() => PlanRequestSchema.parse(payload));
});

test("TS parity: valid execution plan fixture is accepted", () => {
  const payload = loadFixture("valid-execution-plan.json");
  const parsed = legacy.ExecutionPlanSchema.parse(payload);

  assert.equal(parsed.id, "plan-1");
});

test("TS parity: invalid execution plan fixture is rejected", () => {
  const payload = loadFixture("invalid-execution-plan-action-type.json");

  assert.throws(() => legacy.ExecutionPlanSchema.parse(payload));
});

test("TS parity: valid workspace snapshot acceptance fixture is accepted", () => {
  const payload = loadFixture("valid-workspace-snapshot-acceptance.json");
  const parsed = WorkspaceSnapshotAcceptanceRequestSchema.parse(payload);

  assert.equal(parsed.source, "vscode-extension");
});

test("TS parity: invalid workspace snapshot acceptance fixture is rejected", () => {
  const payload = loadFixture("invalid-workspace-snapshot-acceptance.json");

  assert.throws(() => WorkspaceSnapshotAcceptanceRequestSchema.parse(payload));
});