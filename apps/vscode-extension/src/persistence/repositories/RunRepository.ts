import type { AgentRunState, RunHistoryEntry } from "@control-agent/contracts";
import type { SqliteDatabase } from "../db/sqlite";

/**
 * Row shape returned from the runs table plus approval count.
 *
 * Why keep a local row type:
 * - database rows do not always match public contract types 1:1
 * - this keeps SQL mapping explicit
 */
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
 *
 * Responsibilities:
 * - persist one run's core metadata
 * - list recent runs for future history UI
 * - read one run summary by id
 */
export class RunRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Insert or update one run record.
   *
   * Why upsert:
   * - runs evolve over time
   * - the runtime can save the same run multiple times safely
   */
  public upsertRun(state: AgentRunState): void {
    this.db
      .prepare(
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
          VALUES (
            @runId,
            @goalId,
            @goalText,
            @status,
            @currentStep,
            @maxSteps,
            @activeSurface,
            @finalSummary,
            @startedAt,
            @updatedAt
          )
          ON CONFLICT(run_id) DO UPDATE SET
            goal_id = excluded.goal_id,
            goal_text = excluded.goal_text,
            status = excluded.status,
            current_step = excluded.current_step,
            max_steps = excluded.max_steps,
            active_surface = excluded.active_surface,
            final_summary = excluded.final_summary,
            updated_at = excluded.updated_at
        `
      )
      .run({
        runId: state.runId,
        goalId: state.goal.id,
        goalText: state.goal.text,
        status: state.status,
        currentStep: state.currentStep,
        maxSteps: state.maxSteps,
        activeSurface: state.activeSurface ?? null,
        finalSummary: state.finalSummary?.summary ?? null,
        startedAt: state.startedAt,
        updatedAt: state.updatedAt,
      });
  }

  /**
   * Read one run summary by id.
   */
  public getRunHistoryEntryById(runId: string): RunHistoryEntry | null {
    const row = this.db
      .prepare(
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
        `
      )
      .get(runId) as RunHistoryRow | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToHistoryEntry(row);
  }

  /**
   * Return recent run history entries in reverse chronological order.
   */
  public listRecentRuns(limit = 20): RunHistoryEntry[] {
    const rows = this.db
      .prepare(
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
        `
      )
      .all(limit) as RunHistoryRow[];

    return rows.map((row) => this.mapRowToHistoryEntry(row));
  }

  /**
   * Translate one SQL row into the public history contract shape.
   */
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
