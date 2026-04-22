import assert from "node:assert/strict";
import test from "node:test";
import type { RollbackSnapshot, SurfaceAction } from "@control-agent/contracts";
import { UserSettingsAdapter } from "../src/surfaces/user-settings/UserSettingsAdapter";
import { WorkspaceSettingsAdapter } from "../src/surfaces/workspace-settings/WorkspaceSettingsAdapter";
import type {
  SettingsHost,
  SettingsInspection,
} from "../src/surfaces/settings/settingsHost";

/**
 * Very small fake output channel used by the adapters in tests.
 */
function createFakeRuntime() {
  return {
    output: {
      appendLine(_value: string): void {
        // No-op in tests.
      },
    },
  } as const;
}

/**
 * Simple in-memory fake settings host for adapter tests.
 *
 * Why this exists:
 * - keeps tests deterministic
 * - lets us verify inspect/preview/apply/verify/rollback without VS Code
 */
class FakeSettingsHost implements SettingsHost {
  public readonly inspections = new Map<string, SettingsInspection>();

  public readonly updates: Array<{
    settingKey: string;
    value: unknown;
    scope: "user" | "workspace";
  }> = [];

  public workspaceAvailable = true;

  public inspect(settingKey: string): SettingsInspection | undefined {
    return this.inspections.get(settingKey);
  }

  public async update(
    settingKey: string,
    value: unknown,
    scope: "user" | "workspace"
  ): Promise<void> {
    this.updates.push({
      settingKey,
      value,
      scope,
    });

    const existing = this.inspections.get(settingKey) ?? {};

    if (scope === "user") {
      this.inspections.set(settingKey, {
        ...existing,
        globalValue: value,
      });
      return;
    }

    this.inspections.set(settingKey, {
      ...existing,
      workspaceValue: value,
    });
  }

  public hasWorkspace(): boolean {
    return this.workspaceAvailable;
  }
}

/**
 * Helper for building one settings action.
 */
function buildSetAction(
  surface: "userSettings" | "workspaceSettings",
  target: string,
  value: unknown
): SurfaceAction {
  return {
    actionId: `action-${surface}-${target}`,
    surface,
    operation: "set",
    target,
    params: {
      value,
    },
  };
}

/**
 * Helper for building one rollback snapshot.
 */
function buildRollbackSnapshot(
  surface: "userSettings" | "workspaceSettings",
  target: string,
  previousValue: unknown
): RollbackSnapshot {
  return {
    snapshotId: `snapshot-${surface}-${target}`,
    runId: "run-1",
    stepIndex: 0,
    surface,
    target,
    actionOperation: "set",
    snapshotKind: "before-write",
    snapshotData: {
      previousValue,
    },
    createdAt: "2026-04-20T12:00:00.000Z",
  };
}

test("UserSettingsAdapter inspect reads the global value", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();

  host.inspections.set("editor.formatOnSave", {
    globalValue: true,
    workspaceValue: false,
  });

  const adapter = new UserSettingsAdapter(runtime as never, host);

  const state = await adapter.inspect("editor.formatOnSave");

  assert.equal(state.surface, "userSettings");
  assert.equal(state.target, "editor.formatOnSave");
  assert.equal((state.data as { value: unknown }).value, true);
});

test("UserSettingsAdapter preview shows before and after values", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();

  host.inspections.set("editor.formatOnSave", {
    globalValue: false,
  });

  const adapter = new UserSettingsAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildSetAction("userSettings", "editor.formatOnSave", true)
  );

  assert.equal(preview.targetLabel, "User setting: editor.formatOnSave");
  assert.equal(preview.before, false);
  assert.equal(preview.after, true);
});

test("UserSettingsAdapter apply writes through the user scope", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();
  const adapter = new UserSettingsAdapter(runtime as never, host);

  await adapter.apply(
    buildSetAction("userSettings", "editor.formatOnSave", true)
  );

  assert.equal(host.updates.length, 1);
  assert.deepEqual(host.updates[0], {
    settingKey: "editor.formatOnSave",
    value: true,
    scope: "user",
  });
});

test("UserSettingsAdapter verify succeeds after apply", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();
  const adapter = new UserSettingsAdapter(runtime as never, host);

  const action = buildSetAction("userSettings", "editor.formatOnSave", true);

  await adapter.apply(action);
  const verification = await adapter.verify(action);

  assert.equal(verification.success, true);
  assert.equal(verification.status, "verified");
});

test("UserSettingsAdapter rollback restores the previous value", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();

  host.inspections.set("editor.formatOnSave", {
    globalValue: true,
  });

  const adapter = new UserSettingsAdapter(runtime as never, host);

  await adapter.rollback(
    buildRollbackSnapshot("userSettings", "editor.formatOnSave", false)
  );

  assert.equal(host.updates.length, 1);
  assert.deepEqual(host.updates[0], {
    settingKey: "editor.formatOnSave",
    value: false,
    scope: "user",
  });
});

test("WorkspaceSettingsAdapter inspect reads the workspace value", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();

  host.inspections.set("files.autoSave", {
    globalValue: "off",
    workspaceValue: "afterDelay",
  });

  const adapter = new WorkspaceSettingsAdapter(runtime as never, host);

  const state = await adapter.inspect("files.autoSave");

  assert.equal(state.surface, "workspaceSettings");
  assert.equal((state.data as { value: unknown }).value, "afterDelay");
});

test("WorkspaceSettingsAdapter apply writes through the workspace scope", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();
  const adapter = new WorkspaceSettingsAdapter(runtime as never, host);

  await adapter.apply(
    buildSetAction("workspaceSettings", "files.autoSave", "afterDelay")
  );

  assert.equal(host.updates.length, 1);
  assert.deepEqual(host.updates[0], {
    settingKey: "files.autoSave",
    value: "afterDelay",
    scope: "workspace",
  });
});

test("WorkspaceSettingsAdapter verify detects a mismatch", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();

  host.inspections.set("files.autoSave", {
    workspaceValue: "off",
  });

  const adapter = new WorkspaceSettingsAdapter(runtime as never, host);

  const verification = await adapter.verify(
    buildSetAction("workspaceSettings", "files.autoSave", "afterDelay")
  );

  assert.equal(verification.success, false);
  assert.equal(verification.status, "mismatch");
});

test("WorkspaceSettingsAdapter rollback restores the previous workspace value", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();
  const adapter = new WorkspaceSettingsAdapter(runtime as never, host);

  await adapter.rollback(
    buildRollbackSnapshot("workspaceSettings", "files.autoSave", "off")
  );

  assert.equal(host.updates.length, 1);
  assert.deepEqual(host.updates[0], {
    settingKey: "files.autoSave",
    value: "off",
    scope: "workspace",
  });
});

test("WorkspaceSettingsAdapter rejects apply when no workspace exists", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeSettingsHost();
  host.workspaceAvailable = false;

  const adapter = new WorkspaceSettingsAdapter(runtime as never, host);

  await assert.rejects(async () => {
    await adapter.apply(
      buildSetAction("workspaceSettings", "files.autoSave", "afterDelay")
    );
  });
});