import assert from "node:assert/strict";
import test from "node:test";
import type { RollbackSnapshot, SurfaceAction } from "@control-agent/contracts";
import { KeybindingsAdapter } from "../src/surfaces/keybindings/KeybindingsAdapter";
import type { KeybindingsHost } from "../src/surfaces/keybindings/keybindingsHost";

/**
 * Very small fake runtime used by the adapter in tests.
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
 * In-memory fake host for keybindings adapter tests.
 */
class FakeKeybindingsHost implements KeybindingsHost {
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
    return "fake-keybindings.json";
  }
}

/**
 * Build one keybindings action for tests.
 */
function buildAction(
  operation: "upsertBinding" | "removeBinding",
  command: string,
  params: Record<string, unknown> = {}
): SurfaceAction {
  return {
    actionId: `action-${operation}-${command}`,
    surface: "keybindings",
    operation,
    target: command,
    params,
  };
}

/**
 * Build one rollback snapshot for tests.
 */
function buildSnapshot(previousText: string | null): RollbackSnapshot {
  return {
    snapshotId: "snapshot-1",
    runId: "run-1",
    stepIndex: 0,
    surface: "keybindings",
    target: "editor.action.formatDocument",
    actionOperation: "upsertBinding",
    snapshotKind: "before-write",
    snapshotData: {
      previousText,
    },
    createdAt: "2026-04-20T12:00:00.000Z",
  };
}

test("KeybindingsAdapter inspect returns empty entries when the file does not exist", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  const adapter = new KeybindingsAdapter(runtime as never, host);

  const state = await adapter.inspect();

  assert.equal(state.surface, "keybindings");
  assert.equal(state.exists, false);
  assert.deepEqual((state.data as { entries: unknown[] }).entries, []);
});

test("KeybindingsAdapter inspect returns entries for one command target", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();

  host.text = JSON.stringify([
    {
      key: "ctrl+k ctrl+f",
      command: "editor.action.formatDocument",
    },
    {
      key: "ctrl+shift+t",
      command: "workbench.action.reopenClosedEditor",
    },
  ]);

  const adapter = new KeybindingsAdapter(runtime as never, host);

  const state = await adapter.inspect("editor.action.formatDocument");

  assert.equal(
    (state.data as { entries: Array<{ command: string }> }).entries.length,
    1
  );
  assert.equal(
    (state.data as { entries: Array<{ command: string }> }).entries[0]?.command,
    "editor.action.formatDocument"
  );
});

test("KeybindingsAdapter preview shows before and after entries", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();

  host.text = JSON.stringify([
    {
      key: "shift+alt+f",
      command: "editor.action.formatDocument",
    },
  ]);

  const adapter = new KeybindingsAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("upsertBinding", "editor.action.formatDocument", {
      key: "ctrl+k ctrl+f",
    })
  );

  assert.equal(preview.targetLabel, "Keybinding command: editor.action.formatDocument");
  assert.deepEqual(preview.before, [
    {
      key: "shift+alt+f",
      command: "editor.action.formatDocument",
    },
  ]);
    assert.deepEqual(preview.after, [
    {
        key: "ctrl+k ctrl+f",
        command: "editor.action.formatDocument",
    },
    ]);
});

test("KeybindingsAdapter preview warns about simple key conflicts", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();

  host.text = JSON.stringify([
    {
      key: "ctrl+k ctrl+f",
      command: "some.other.command",
    },
  ]);

  const adapter = new KeybindingsAdapter(runtime as never, host);

  const preview = await adapter.preview(
    buildAction("upsertBinding", "editor.action.formatDocument", {
      key: "ctrl+k ctrl+f",
    })
  );

  assert.equal(preview.warnings.length, 1);
});

test("KeybindingsAdapter apply writes a new keybinding entry", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  const adapter = new KeybindingsAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("upsertBinding", "editor.action.formatDocument", {
      key: "ctrl+k ctrl+f",
      when: "editorTextFocus",
    })
  );

  const written = JSON.parse(host.text ?? "[]") as Array<{
    key: string;
    command: string;
    when?: string;
  }>;

  assert.equal(written.length, 1);
  assert.equal(written[0]?.command, "editor.action.formatDocument");
  assert.equal(written[0]?.when, "editorTextFocus");
});

test("KeybindingsAdapter verify succeeds after applying an upsert", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  const adapter = new KeybindingsAdapter(runtime as never, host);

  const action = buildAction("upsertBinding", "editor.action.formatDocument", {
    key: "ctrl+k ctrl+f",
  });

  await adapter.apply(action);
  const verification = await adapter.verify(action);

  assert.equal(verification.success, true);
  assert.equal(verification.status, "verified");
});

test("KeybindingsAdapter removeBinding deletes matching entries", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();

  host.text = JSON.stringify([
    {
      key: "ctrl+k ctrl+f",
      command: "editor.action.formatDocument",
    },
    {
      key: "ctrl+shift+t",
      command: "workbench.action.reopenClosedEditor",
    },
  ]);

  const adapter = new KeybindingsAdapter(runtime as never, host);

  await adapter.apply(
    buildAction("removeBinding", "editor.action.formatDocument")
  );

  const written = JSON.parse(host.text ?? "[]") as Array<{
    command: string;
  }>;

  assert.equal(written.length, 1);
  assert.equal(written[0]?.command, "workbench.action.reopenClosedEditor");
});

test("KeybindingsAdapter rollback restores previous file text", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  const adapter = new KeybindingsAdapter(runtime as never, host);

  await adapter.rollback(
    buildSnapshot(
      JSON.stringify([
        {
          key: "shift+alt+f",
          command: "editor.action.formatDocument",
        },
      ])
    )
  );

  const restored = JSON.parse(host.text ?? "[]") as Array<{
    key: string;
    command: string;
  }>;

  assert.equal(restored.length, 1);
  assert.equal(restored[0]?.key, "shift+alt+f");
});

test("KeybindingsAdapter rollback deletes the file when previousText is null", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  host.text = "[]";

  const adapter = new KeybindingsAdapter(runtime as never, host);

  await adapter.rollback(buildSnapshot(null));

  assert.equal(host.text, null);
});

test("KeybindingsAdapter rejects unsupported operations", async () => {
  const runtime = createFakeRuntime();
  const host = new FakeKeybindingsHost();
  const adapter = new KeybindingsAdapter(runtime as never, host);

  await assert.rejects(async () => {
    await adapter.preview({
      actionId: "bad-action",
      surface: "keybindings",
      operation: "set",
      target: "editor.action.formatDocument",
      params: {},
    });
  });
});