import {
  RollbackSnapshotSchema,
  type RollbackSnapshot,
} from "@control-agent/contracts";

/**
 * Serialized snapshot file envelope.
 *
 * Why use an envelope instead of writing the raw snapshot directly:
 * - leaves room for future metadata/versioning
 * - keeps the on-disk format explicit
 */
interface SerializedSnapshotEnvelope {
  readonly version: 1;
  readonly snapshot: RollbackSnapshot;
}

/**
 * Serialize one rollback snapshot into human-readable JSON.
 *
 * We keep indentation because these files are useful for debugging
 * during early bring-up and later rollback investigation.
 */
export function serializeSnapshot(snapshot: RollbackSnapshot): string {
  const envelope: SerializedSnapshotEnvelope = {
    version: 1,
    snapshot,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Deserialize and validate one snapshot file.
 *
 * Why validate here:
 * - file-based data can drift or be corrupted
 * - parsing through the shared contract gives us one source of truth
 */
export function deserializeSnapshot(rawText: string): RollbackSnapshot {
  const parsed = JSON.parse(rawText) as {
    version?: unknown;
    snapshot?: unknown;
  };

  if (parsed.version !== 1) {
    throw new Error("Unsupported snapshot file version.");
  }

  return RollbackSnapshotSchema.parse(parsed.snapshot);
}
