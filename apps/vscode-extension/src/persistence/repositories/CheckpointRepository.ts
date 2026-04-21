import type { RunCheckpoint, ToolCallRequest } from "@control-agent/contracts";
import type { SqliteDatabase } from "../db/sqlite";

/**
 * Small helper for parsing JSON columns safely.
 *
 * Current phase note:
 * - the data written here comes from our own runtime
 * - basic parsing is enough for now
 */
function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

/**
 * Repository for durable runtime checkpoints.
 */
export class CheckpointRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Insert or update one checkpoint record.
   */
  public saveCheckpoint(checkpoint: RunCheckpoint): void {
    this.db
      .prepare(
        `
          INSERT INTO checkpoints (
            checkpoint_id,
            run_id,
            step_index,
            status,
            active_surface,
            note,
            context_json,
            pending_tool_call_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(checkpoint_id) DO UPDATE SET
            run_id = excluded.run_id,
            step_index = excluded.step_index,
            status = excluded.status,
            active_surface = excluded.active_surface,
            note = excluded.note,
            context_json = excluded.context_json,
            pending_tool_call_json = excluded.pending_tool_call_json,
            created_at = excluded.created_at
        `
      )
      .run(
        checkpoint.checkpointId,
        checkpoint.runId,
        checkpoint.stepIndex,
        checkpoint.status,
        checkpoint.activeSurface ?? null,
        checkpoint.note,
        JSON.stringify(checkpoint.context),
        checkpoint.pendingToolCall
          ? JSON.stringify(checkpoint.pendingToolCall)
          : null,
        checkpoint.createdAt
      );
  }

  /**
   * Return all checkpoints for one run in step order.
   */
  public listByRunId(runId: string): RunCheckpoint[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            checkpoint_id,
            run_id,
            step_index,
            status,
            active_surface,
            note,
            context_json,
            pending_tool_call_json,
            created_at
          FROM checkpoints
          WHERE run_id = ?
          ORDER BY step_index ASC, created_at ASC
        `
      )
      .all(runId) as Array<{
      checkpoint_id: string;
      run_id: string;
      step_index: number;
      status: RunCheckpoint["status"];
      active_surface: RunCheckpoint["activeSurface"] | null;
      note: string;
      context_json: string;
      pending_tool_call_json: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      checkpointId: row.checkpoint_id,
      runId: row.run_id,
      stepIndex: row.step_index,
      status: row.status,
      activeSurface: row.active_surface ?? undefined,
      note: row.note,
      context: parseJson(row.context_json, {}),
      pendingToolCall: parseJson<ToolCallRequest | undefined>(
        row.pending_tool_call_json,
        undefined
      ),
      createdAt: row.created_at,
    }));
  }

  /**
   * Return the latest checkpoint for one run.
   */
  public getLatestForRun(runId: string): RunCheckpoint | null {
    const row = this.db
      .prepare(
        `
          SELECT
            checkpoint_id,
            run_id,
            step_index,
            status,
            active_surface,
            note,
            context_json,
            pending_tool_call_json,
            created_at
          FROM checkpoints
          WHERE run_id = ?
          ORDER BY step_index DESC, created_at DESC
          LIMIT 1
        `
      )
      .get(runId) as
      | {
          checkpoint_id: string;
          run_id: string;
          step_index: number;
          status: RunCheckpoint["status"];
          active_surface: RunCheckpoint["activeSurface"] | null;
          note: string;
          context_json: string;
          pending_tool_call_json: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      checkpointId: row.checkpoint_id,
      runId: row.run_id,
      stepIndex: row.step_index,
      status: row.status,
      activeSurface: row.active_surface ?? undefined,
      note: row.note,
      context: parseJson(row.context_json, {}),
      pendingToolCall: parseJson<ToolCallRequest | undefined>(
        row.pending_tool_call_json,
        undefined
      ),
      createdAt: row.created_at,
    };
  }
}
