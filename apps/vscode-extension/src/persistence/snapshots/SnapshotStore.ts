import * as fs from "node:fs";
import * as path from "node:path";
import type { RollbackSnapshot } from "@control-agent/contracts";
import type { ExtensionRuntime } from "../../state/runtime";
import { deserializeSnapshot, serializeSnapshot } from "./SnapshotSerializer";
import {
  ensureRunSnapshotDirectory,
  ensureSnapshotRootDirectory,
  resolveRunSnapshotDirectory,
  resolveSnapshotFilePath,
} from "./snapshotPaths";

/**
 * File-based rollback snapshot store.
 *
 * Why this exists:
 * - rollback payloads do not belong in the same shape as query-heavy metadata
 * - file snapshots are easier to inspect and debug
 * - later rollback services can restore directly from these artifacts
 */
export class SnapshotStore {
  public constructor(private readonly runtime: ExtensionRuntime) {}

  /**
   * Save one rollback snapshot to disk.
   *
   * The file is written under:
   *   <globalStorage>/snapshots/<runId>/<snapshotId>.json
   */
  public saveSnapshot(snapshot: RollbackSnapshot): string {
    ensureRunSnapshotDirectory(this.runtime, snapshot.runId);

    const filePath = resolveSnapshotFilePath(
      this.runtime,
      snapshot.runId,
      snapshot.snapshotId
    );

    const serialized = serializeSnapshot(snapshot);

    fs.writeFileSync(filePath, serialized, "utf8");

    this.runtime.output.appendLine(
      `[snapshots] saved snapshot ${snapshot.snapshotId} for run ${snapshot.runId}`
    );

    return filePath;
  }

  /**
   * Read one snapshot by run id + snapshot id.
   *
   * Returns null when the file does not exist.
   */
  public getSnapshot(
    runId: string,
    snapshotId: string
  ): RollbackSnapshot | null {
    const filePath = resolveSnapshotFilePath(this.runtime, runId, snapshotId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const rawText = fs.readFileSync(filePath, "utf8");
    return deserializeSnapshot(rawText);
  }

  /**
   * Return all snapshots for one run.
   *
   * We sort by createdAt ascending so later rollback logic can reason
   * about snapshot order deterministically.
   */
  public listSnapshotsForRun(runId: string): RollbackSnapshot[] {
    ensureSnapshotRootDirectory(this.runtime);

    const runDir = resolveRunSnapshotDirectory(this.runtime, runId);

    if (!fs.existsSync(runDir)) {
      return [];
    }

    const fileNames = fs
      .readdirSync(runDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((left, right) => left.localeCompare(right));

    const snapshots = fileNames.map((fileName) => {
      const filePath = path.join(runDir, fileName);
      const rawText = fs.readFileSync(filePath, "utf8");
      return deserializeSnapshot(rawText);
    });

    return snapshots.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  /**
   * Delete one snapshot file if it exists.
   */
  public deleteSnapshot(runId: string, snapshotId: string): void {
    const filePath = resolveSnapshotFilePath(this.runtime, runId, snapshotId);

    if (!fs.existsSync(filePath)) {
      return;
    }

    fs.unlinkSync(filePath);

    this.runtime.output.appendLine(
      `[snapshots] deleted snapshot ${snapshotId} for run ${runId}`
    );
  }

  /**
   * Delete all snapshots for one run.
   *
   * This is not needed by rollback yet, but it will be useful later
   * for cleanup flows and tests.
   */
  public deleteSnapshotsForRun(runId: string): void {
    const runDir = resolveRunSnapshotDirectory(this.runtime, runId);

    if (!fs.existsSync(runDir)) {
      return;
    }

    fs.rmSync(runDir, { recursive: true, force: true });

    this.runtime.output.appendLine(
      `[snapshots] deleted all snapshots for run ${runId}`
    );
  }
}
