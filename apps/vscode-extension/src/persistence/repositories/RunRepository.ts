import type { AgentRunState, RunHistoryEntry } from "@control-agent/contracts";
import {
  executeMutation,
  queryAll,
  queryOne,
  type SqliteDatabase,
} from "../db/sqlite";

interface RunHistoryRow {
  readonly run_id: string;
  readonly goal_text: string;
  readonly status: RunHistoryEntry["status"];
  readonly current_step: number;
  readonly started_at: string;
  readonly updated_at: string;
  readonly final_summary: string | null;
  readonly approval_count: number;
}

/**
 * Repository for durable run metadata.
 */
export class RunRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Insert or update one run record.
   */
  public upsertRun(state: AgentRunState): void {
    executeMutation(
      this.db,
      `
        INSERT INTO runs (
          run_id,
          goal_id,
          goal_text,
          status,
          current_step,
          max_steps,
          active_surface,
          final_summary,
          started_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          goal_id = excluded.goal_id,
          goal_text = excluded.goal_text,
          status = excluded.status,
          current_step = excluded.current_step,
          max_steps = excluded.max_steps,
          active_surface = excluded.active_surface,
          final_summary = excluded.final_summary,
          updated_at = excluded.updated_at
      `,
      [
        state.runId,
        state.goal.id,
        state.goal.text,
        state.status,
        state.currentStep,
        state.maxSteps,
        state.activeSurface ?? null,
        state.finalSummary?.summary ?? null,
        state.startedAt,
        state.updatedAt,
      ]
    );
  }

  /**
   * Read one run summary by id.
   */
  public getRunHistoryEntryById(runId: string): RunHistoryEntry | null {
    const row = queryOne<RunHistoryRow>(
      this.db,
      `
        SELECT
          r.run_id,
          r.goal_text,
          r.status,
          r.current_step,
          r.started_at,
          r.updated_at,
          r.final_summary,
          COUNT(a.request_id) AS approval_count
        FROM runs r
        LEFT JOIN approvals a
          ON a.run_id = r.run_id
        WHERE r.run_id = ?
        GROUP BY
          r.run_id,
          r.goal_text,
          r.status,
          r.current_step,
          r.started_at,
          r.updated_at,
          r.final_summary
      `,
      [runId]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToHistoryEntry(row);
  }

  /**
   * Return recent run history entries in reverse chronological order.
   */
  public listRecentRuns(limit = 20): RunHistoryEntry[] {
    const rows = queryAll<RunHistoryRow>(
      this.db,
      `
        SELECT
          r.run_id,
          r.goal_text,
          r.status,
          r.current_step,
          r.started_at,
          r.updated_at,
          r.final_summary,
          COUNT(a.request_id) AS approval_count
        FROM runs r
        LEFT JOIN approvals a
          ON a.run_id = r.run_id
        GROUP BY
          r.run_id,
          r.goal_text,
          r.status,
          r.current_step,
          r.started_at,
          r.updated_at,
          r.final_summary
        ORDER BY r.started_at DESC
        LIMIT ?
      `,
      [limit]
    );

    return rows.map((row) => this.mapRowToHistoryEntry(row));
  }

  private mapRowToHistoryEntry(row: RunHistoryRow): RunHistoryEntry {
    const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

    return {
      runId: row.run_id,
      goalText: row.goal_text,
      status: row.status,
      stepCount: row.current_step,
      approvalCount: row.approval_count,
      startedAt: row.started_at,
      completedAt: terminalStatuses.has(row.status)
        ? row.updated_at
        : undefined,
      summary: row.final_summary ?? undefined,
    };
  }
}
