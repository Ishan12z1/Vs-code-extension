import assert from "node:assert/strict";
import test from "node:test";
import type { RollbackSnapshot, SurfaceAction } from "@control-agent/contracts";
import { LaunchJsonAdapter } from "../src/surfaces/launch-json/LaunchJsonAdapter";
import type { LaunchJsonHost } from "../src/surfaces/launch-json/launchJsonHost";

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
 * In-memory fake host for launch.json adapter tests.
 */
class FakeLaunchJsonHost implements LaunchJsonHost {
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
    return ".vscode/launch.json";
  }
}

/**
 * Build one launch.json action for tests.
 */
function buildAction(
  operation: "upsertLaunchConfiguration" | "removeLaunchConfiguration",
  name: string,
  params: Record<string, unknown> = {}
): SurfaceAction {
  return {
    actionId: `action-${operation}-${name}`,
    surface: "launchJson",
    operation,
    target: name,
    params,
  };
}

/**
 * Build one rollback snapshot for launch.json.
 */
function buildSnapshot(previousText: string | null): RollbackSnapshot {
  return {
    snapshotId: "snapshot-1",
    runId: "run-1",
    stepIndex: 0,
    surface: "launchJson",
    target: "Launch Program",
    actionOperation: "upsertLaunchConfiguration",
    snapshotKind: "before-write",
    snapshotData: {
      previousText,
    },
    createdAt: "2026-04-20T12:00:00.000Z",
  };
}

test("LaunchJsonAdapter inspect returns empty configurations when the file does not exist", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  const adapter = new LaunchJsonAdapter(runtime as never, host);

  const state = await adapter.inspect();

  assert.equal(state.surface, "launchJson");
  assert.equal(state.exists, false);
  assert.deepEqual((state.data as { configurations: unknown[] }).configurations, []);
});

test("LaunchJsonAdapter inspect returns one matching configuration by name", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();

  host.text = JSON.stringify({
    version: "0.2.0",
    configurations: [
      {
        name: "Launch Program",
        type: "node",
        request: "launch",
      },
      {
        name: "Attach Program",
        type: "node",
        request: "attach",
      },
    ],
  });

  const adapter = new LaunchJsonAdapter(runtime as never, host);

  const state = await adapter.inspect("Launch Program");

  assert.equal(
    (state.data as { configurations: Array<{ name: string }> }).configurations.length,
    1
  );
  assert.equal(
    (state.data as { configurations: Array<{ name: string }> }).configurations[0]?.name,
    "Launch Program"
  );
});

test("LaunchJsonAdapter preview shows before and after configurations", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();

  host.text = JSON.stringify({
    version: "0.2.0",
    configurations: [
      {
        name: "Launch Program",
        type: "node",
        request: "launch",
        program: "${workspaceFolder}/old.js",
      },
    ],
  });

  const adapter = new LaunchJsonAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("upsertLaunchConfiguration", "Launch Program", {
      configuration: {
        name: "Launch Program",
        type: "node",
        request: "launch",
        program: "${workspaceFolder}/index.js",
      },
    })
  );

  assert.equal(preview.targetLabel, "Launch configuration: Launch Program");
  assert.deepEqual(preview.before, [
    {
      name: "Launch Program",
      type: "node",
      request: "launch",
      program: "${workspaceFolder}/old.js",
    },
  ]);
  assert.deepEqual(preview.after, [
    {
      name: "Launch Program",
      type: "node",
      request: "launch",
      program: "${workspaceFolder}/index.js",
    },
  ]);
});

test("LaunchJsonAdapter apply writes a new configuration", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  const adapter = new LaunchJsonAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("upsertLaunchConfiguration", "Launch Program", {
      configuration: {
        name: "Launch Program",
        type: "node",
        request: "launch",
        program: "${workspaceFolder}/index.js",
      },
    })
  );

  const written = JSON.parse(host.text ?? "{}") as {
    version: string;
    configurations: Array<{ name: string; program: string }>;
  };

  assert.equal(written.version, "0.2.0");
  assert.equal(written.configurations.length, 1);
  assert.equal(written.configurations[0]?.name, "Launch Program");
});

test("LaunchJsonAdapter verify succeeds after applying an upsert", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  const adapter = new LaunchJsonAdapter(runtime as never, host);

  const action = buildAction("upsertLaunchConfiguration", "Launch Program", {
    configuration: {
      name: "Launch Program",
      type: "node",
      request: "launch",
      program: "${workspaceFolder}/index.js",
    },
  });

  await adapter.apply(action);
  const verification = await adapter.verify(action);

  assert.equal(verification.success, true);
  assert.equal(verification.status, "verified");
});

test("LaunchJsonAdapter removeLaunchConfiguration deletes the matching configuration", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();

  host.text = JSON.stringify({
    version: "0.2.0",
    configurations: [
      {
        name: "Launch Program",
        type: "node",
        request: "launch",
      },
      {
        name: "Attach Program",
        type: "node",
        request: "attach",
      },
    ],
  });

  const adapter = new LaunchJsonAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("removeLaunchConfiguration", "Launch Program")
  );

  const written = JSON.parse(host.text ?? "{}") as {
    configurations: Array<{ name: string }>;
  };

  assert.equal(written.configurations.length, 1);
  assert.equal(written.configurations[0]?.name, "Attach Program");
});

test("LaunchJsonAdapter rollback restores previous file text", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  const adapter = new LaunchJsonAdapter(runtime as never, host);

  await adapter.rollback(
    buildSnapshot(
      JSON.stringify({
        version: "0.2.0",
        configurations: [
          {
            name: "Launch Program",
            type: "node",
            request: "launch",
          },
        ],
      })
    )
  );

  const restored = JSON.parse(host.text ?? "{}") as {
    configurations: Array<{ name: string }>;
  };

  assert.equal(restored.configurations.length, 1);
  assert.equal(restored.configurations[0]?.name, "Launch Program");
});

test("LaunchJsonAdapter rollback deletes the file when previousText is null", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  host.text = "{}";

  const adapter = new LaunchJsonAdapter(runtime as never, host);

  await adapter.rollback(buildSnapshot(null));

  assert.equal(host.text, null);
});

test("LaunchJsonAdapter rejects unsupported operations", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeLaunchJsonHost();
  const adapter = new LaunchJsonAdapter(runtime as never, host);

  await assert.rejects(async () => {
    await adapter.preview({
      actionId: "bad-action",
      surface: "launchJson",
      operation: "set",
      target: "Launch Program",
      params: {},
    });
  });
});