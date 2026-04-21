import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionRuntime } from "../../state/runtime";

/**
 * Root and derived paths used by the file-based snapshot store.
 *
 * Why this exists:
 * - keeps snapshot filesystem layout in one place
 * - makes later rollback code easier to reason about
 * - avoids hard-coding path logic across multiple files
 */
export interface SnapshotPaths {
  /**
   * Root folder for all rollback snapshots.
   */
  readonly snapshotRootDir: string;
}

/**
 * Resolve the root snapshot directory for the extension.
 *
 * We place snapshots under the extension's global storage area so they:
 * - stay local to the extension
 * - survive across sessions
 * - stay grouped with the runtime database
 */
export function resolveSnapshotPaths(runtime: ExtensionRuntime): SnapshotPaths {
  return {
    snapshotRootDir: path.join(
      runtime.context.globalStorageUri.fsPath,
      "snapshots"
    ),
  };
}

/**
 * Ensure the root snapshot directory exists.
 */
export function ensureSnapshotRootDirectory(
  runtime: ExtensionRuntime
): SnapshotPaths {
  const paths = resolveSnapshotPaths(runtime);

  fs.mkdirSync(paths.snapshotRootDir, { recursive: true });

  return paths;
}

/**
 * Return the per-run snapshot directory.
 *
 * Why organize by run:
 * - keeps related snapshots together
 * - makes listing and deletion by run simple later
 */
export function resolveRunSnapshotDirectory(
  runtime: ExtensionRuntime,
  runId: string
): string {
  const paths = ensureSnapshotRootDirectory(runtime);
  return path.join(paths.snapshotRootDir, runId);
}

/**
 * Ensure the per-run snapshot directory exists.
 */
export function ensureRunSnapshotDirectory(
  runtime: ExtensionRuntime,
  runId: string
): string {
  const runDir = resolveRunSnapshotDirectory(runtime, runId);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
}

/**
 * Resolve the file path for one snapshot.
 *
 * We store each snapshot as one JSON file named by its snapshot id.
 */
export function resolveSnapshotFilePath(
  runtime: ExtensionRuntime,
  runId: string,
  snapshotId: string
): string {
  const runDir = resolveRunSnapshotDirectory(runtime, runId);
  return path.join(runDir, `${snapshotId}.json`);
}
