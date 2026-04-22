import assert from "node:assert/strict";
import test from "node:test";
import type { RollbackSnapshot, SurfaceAction } from "@control-agent/contracts";
import { ExtensionsLifecycleAdapter } from "../src/surfaces/extensions/ExtensionsLifecycleAdapter";
import type {
  ExtensionLifecycleState,
  ExtensionsHost,
} from "../src/surfaces/extensions/extensionsHost";

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
 * In-memory fake extensions host.
 */
class FakeExtensionsHost implements ExtensionsHost {
  public readonly states = new Map<string, ExtensionLifecycleState>();

  public async inspectExtension(
    extensionId: string
  ): Promise<ExtensionLifecycleState> {
    return (
      this.states.get(extensionId) ?? {
        extensionId,
        installed: false,
        enabled: false,
      }
    );
  }

  public async listInstalledExtensions(): Promise<ExtensionLifecycleState[]> {
    return [...this.states.values()].filter((state) => state.installed);
  }

  public async installExtension(
    extensionId: string,
    version?: string
  ): Promise<void> {
    this.states.set(extensionId, {
      extensionId,
      installed: true,
      enabled: true,
      version,
    });
  }

  public async updateExtension(
    extensionId: string,
    version?: string
  ): Promise<void> {
    const current = await this.inspectExtension(extensionId);

    this.states.set(extensionId, {
      extensionId,
      installed: true,
      enabled: current.enabled || true,
      version: version ?? current.version,
    });
  }

  public async enableExtension(extensionId: string): Promise<void> {
    const current = await this.inspectExtension(extensionId);

    this.states.set(extensionId, {
      ...current,
      installed: true,
      enabled: true,
    });
  }

  public async disableExtension(extensionId: string): Promise<void> {
    const current = await this.inspectExtension(extensionId);

    this.states.set(extensionId, {
      ...current,
      installed: true,
      enabled: false,
    });
  }

  public async uninstallExtension(extensionId: string): Promise<void> {
    this.states.set(extensionId, {
      extensionId,
      installed: false,
      enabled: false,
      version: undefined,
    });
  }
}

/**
 * Build one generic lifecycle action.
 */
function buildAction(
  operation:
    | "installExtension"
    | "updateExtension"
    | "enableExtension"
    | "disableExtension"
    | "uninstallExtension",
  extensionId: string,
  params: Record<string, unknown> = {}
): SurfaceAction {
  return {
    actionId: `action-${operation}-${extensionId}`,
    surface: "extensionsLifecycle",
    operation,
    target: extensionId,
    params,
  };
}

/**
 * Build one rollback snapshot for lifecycle state.
 */
function buildSnapshot(
  extensionId: string,
  previousState: ExtensionLifecycleState
): RollbackSnapshot {
  return {
    snapshotId: `snapshot-${extensionId}`,
    runId: "run-1",
    stepIndex: 0,
    surface: "extensionsLifecycle",
    target: extensionId,
    actionOperation: "installExtension",
    snapshotKind: "before-write",
    snapshotData: {
      previousState,
    },
    createdAt: "2026-04-20T12:00:00.000Z",
  };
}

test("ExtensionsLifecycleAdapter inspect returns one installed extension", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  host.states.set("ms-python.python", {
    extensionId: "ms-python.python",
    installed: true,
    enabled: true,
    version: "2026.4.0",
  });

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  const state = await adapter.inspect("ms-python.python");

  assert.equal(state.surface, "extensionsLifecycle");
  assert.equal(
    (state.data as { extension: ExtensionLifecycleState }).extension.extensionId,
    "ms-python.python"
  );
});

test("ExtensionsLifecycleAdapter preview shows before and after states", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("installExtension", "ms-python.python", {
      version: "2026.4.0",
    })
  );

  assert.equal(preview.targetLabel, "Extension: ms-python.python");
  assert.equal((preview.before as ExtensionLifecycleState).installed, false);
  assert.equal((preview.after as ExtensionLifecycleState).installed, true);
});

test("ExtensionsLifecycleAdapter apply installs an extension", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();
  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("installExtension", "ms-python.python", {
      version: "2026.4.0",
    })
  );

  const state = await host.inspectExtension("ms-python.python");

  assert.equal(state.installed, true);
  assert.equal(state.version, "2026.4.0");
});

test("ExtensionsLifecycleAdapter verify succeeds after install", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();
  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  const action = buildAction("installExtension", "ms-python.python", {
    version: "2026.4.0",
  });

  await adapter.apply(action);
  const verification = await adapter.verify(action);

  assert.equal(verification.success, true);
  assert.equal(verification.status, "verified");
});

test("ExtensionsLifecycleAdapter disable updates enabled state", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  host.states.set("ms-python.python", {
    extensionId: "ms-python.python",
    installed: true,
    enabled: true,
    version: "2026.4.0",
  });

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("disableExtension", "ms-python.python")
  );

  const state = await host.inspectExtension("ms-python.python");

  assert.equal(state.installed, true);
  assert.equal(state.enabled, false);
});

test("ExtensionsLifecycleAdapter uninstall removes installed state", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  host.states.set("ms-python.python", {
    extensionId: "ms-python.python",
    installed: true,
    enabled: true,
    version: "2026.4.0",
  });

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("uninstallExtension", "ms-python.python")
  );

  const state = await host.inspectExtension("ms-python.python");

  assert.equal(state.installed, false);
  assert.equal(state.enabled, false);
});

test("ExtensionsLifecycleAdapter rollback restores previous lifecycle state", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  host.states.set("ms-python.python", {
    extensionId: "ms-python.python",
    installed: false,
    enabled: false,
  });

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  await adapter.rollback(
    buildSnapshot("ms-python.python", {
      extensionId: "ms-python.python",
      installed: true,
      enabled: true,
      version: "2026.4.0",
    })
  );

  const state = await host.inspectExtension("ms-python.python");

  assert.equal(state.installed, true);
  assert.equal(state.enabled, true);
  assert.equal(state.version, "2026.4.0");
});

test("ExtensionsLifecycleAdapter preview warns for uninstall", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();

  host.states.set("ms-python.python", {
    extensionId: "ms-python.python",
    installed: true,
    enabled: true,
    version: "2026.4.0",
  });

  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("uninstallExtension", "ms-python.python")
  );

  assert.equal(preview.warnings.length, 1);
});

test("ExtensionsLifecycleAdapter rejects unsupported operations", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeExtensionsHost();
  const adapter = new ExtensionsLifecycleAdapter(runtime as never, host);

  await assert.rejects(async () => {
    await adapter.preview({
      actionId: "bad-action",
      surface: "extensionsLifecycle",
      operation: "set",
      target: "ms-python.python",
      params: {},
    });
  });
});