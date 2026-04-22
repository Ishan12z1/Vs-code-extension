import assert from "node:assert/strict";
import test from "node:test";
import type { RollbackSnapshot, SurfaceAction } from "@control-agent/contracts";
import { TasksJsonAdapter } from "../src/surfaces/tasks-json/TasksJsonAdapter";
import type { TasksJsonHost } from "../src/surfaces/tasks-json/tasksJsonHost";

/**
 * Tiny fake runtime used by adapter tests.
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
 * In-memory fake host for tasks.json adapter tests.
 */
class FakeTasksJsonHost implements TasksJsonHost {
  public text: string | null = null;

  public async readText(): Promise<string | null> {
    return this.text;
  }

  public async writeText(text: string): Promise<void> {
    this.text = text;
  }

  public async deleteFile(): Promise<void> {
    this.text = null;
  }

  public getTargetLabel(): string {
    return ".vscode/tasks.json";
  }
}

/**
 * Build one tasks.json action for tests.
 */
function buildAction(
  operation: "upsertTask" | "removeTask",
  label: string,
  params: Record<string, unknown> = {}
): SurfaceAction {
  return {
    actionId: `action-${operation}-${label}`,
    surface: "tasksJson",
    operation,
    target: label,
    params,
  };
}

/**
 * Build one rollback snapshot for tasks.json.
 */
function buildSnapshot(previousText: string | null): RollbackSnapshot {
  return {
    snapshotId: "snapshot-1",
    runId: "run-1",
    stepIndex: 0,
    surface: "tasksJson",
    target: "test",
    actionOperation: "upsertTask",
    snapshotKind: "before-write",
    snapshotData: {
      previousText,
    },
    createdAt: "2026-04-20T12:00:00.000Z",
  };
}

test("TasksJsonAdapter inspect returns empty tasks when the file does not exist", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  const adapter = new TasksJsonAdapter(runtime as never, host);

  const state = await adapter.inspect();

  assert.equal(state.surface, "tasksJson");
  assert.equal(state.exists, false);
  assert.deepEqual((state.data as { tasks: unknown[] }).tasks, []);
});

test("TasksJsonAdapter inspect returns one matching task by label", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();

  host.text = JSON.stringify({
    version: "2.0.0",
    tasks: [
      {
        label: "build",
        type: "shell",
        command: "npm run build",
      },
      {
        label: "test",
        type: "shell",
        command: "npm test",
      },
    ],
  });

  const adapter = new TasksJsonAdapter(runtime as never, host);

  const state = await adapter.inspect("build");

  assert.equal((state.data as { tasks: Array<{ label: string }> }).tasks.length, 1);
  assert.equal(
    (state.data as { tasks: Array<{ label: string }> }).tasks[0]?.label,
    "build"
  );
});

test("TasksJsonAdapter preview shows before and after tasks", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();

  host.text = JSON.stringify({
    version: "2.0.0",
    tasks: [
      {
        label: "build",
        type: "shell",
        command: "npm run old-build",
      },
    ],
  });

  const adapter = new TasksJsonAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("upsertTask", "build", {
      task: {
        label: "build",
        type: "shell",
        command: "npm run build",
      },
    })
  );

  assert.equal(preview.targetLabel, "Task label: build");
  assert.deepEqual(preview.before, [
    {
      label: "build",
      type: "shell",
      command: "npm run old-build",
    },
  ]);
  assert.deepEqual(preview.after, [
    {
      label: "build",
      type: "shell",
      command: "npm run build",
    },
  ]);
});

test("TasksJsonAdapter apply writes a new task", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  const adapter = new TasksJsonAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("upsertTask", "test", {
      task: {
        label: "test",
        type: "shell",
        command: "npm test",
      },
    })
  );

  const written = JSON.parse(host.text ?? "{}") as {
    version: string;
    tasks: Array<{ label: string; command: string }>;
  };

  assert.equal(written.version, "2.0.0");
  assert.equal(written.tasks.length, 1);
  assert.equal(written.tasks[0]?.label, "test");
});

test("TasksJsonAdapter verify succeeds after applying an upsert", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  const adapter = new TasksJsonAdapter(runtime as never, host);

  const action = buildAction("upsertTask", "test", {
    task: {
      label: "test",
      type: "shell",
      command: "npm test",
    },
  });

  await adapter.apply(action);
  const verification = await adapter.verify(action);

  assert.equal(verification.success, true);
  assert.equal(verification.status, "verified");
});

test("TasksJsonAdapter removeTask deletes the matching task", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();

  host.text = JSON.stringify({
    version: "2.0.0",
    tasks: [
      {
        label: "build",
        type: "shell",
        command: "npm run build",
      },
      {
        label: "test",
        type: "shell",
        command: "npm test",
      },
    ],
  });

  const adapter = new TasksJsonAdapter(runtime as never, host);

  await adapter.apply(buildAction("removeTask", "build"));

  const written = JSON.parse(host.text ?? "{}") as {
    tasks: Array<{ label: string }>;
  };

  assert.equal(written.tasks.length, 1);
  assert.equal(written.tasks[0]?.label, "test");
});

test("TasksJsonAdapter rollback restores previous file text", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  const adapter = new TasksJsonAdapter(runtime as never, host);

  await adapter.rollback(
    buildSnapshot(
      JSON.stringify({
        version: "2.0.0",
        tasks: [
          {
            label: "build",
            type: "shell",
            command: "npm run build",
          },
        ],
      })
    )
  );

  const restored = JSON.parse(host.text ?? "{}") as {
    tasks: Array<{ label: string }>;
  };

  assert.equal(restored.tasks.length, 1);
  assert.equal(restored.tasks[0]?.label, "build");
});

test("TasksJsonAdapter rollback deletes the file when previousText is null", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  host.text = "{}";

  const adapter = new TasksJsonAdapter(runtime as never, host);

  await adapter.rollback(buildSnapshot(null));

  assert.equal(host.text, null);
});

test("TasksJsonAdapter rejects unsupported operations", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeTasksJsonHost();
  const adapter = new TasksJsonAdapter(runtime as never, host);

  await assert.rejects(async () => {
    await adapter.preview({
      actionId: "bad-action",
      surface: "tasksJson",
      operation: "set",
      target: "test",
      params: {},
    });
  });
});