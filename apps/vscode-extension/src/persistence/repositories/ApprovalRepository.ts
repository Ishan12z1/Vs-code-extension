import type { ApprovalDecisionRecord } from "@control-agent/contracts";
import type { SqliteDatabase } from "../db/sqlite";

/**
 * Repository for durable approval records.
 */
export class ApprovalRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Insert or update one approval decision record.
   *
   * Why upsert:
   * - keeps the write path idempotent during early runtime bring-up
   */
  public recordDecision(record: ApprovalDecisionRecord): void {
    this.db
      .prepare(
        `
          INSERT INTO approvals (
            request_id,
            run_id,
            decision,
            reason,
            decided_at
          )
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(request_id) DO UPDATE SET
            run_id = excluded.run_id,
            decision = excluded.decision,
            reason = excluded.reason,
            decided_at = excluded.decided_at
        `
      )
      .run(
        record.requestId,
        record.runId,
        record.decision,
        record.reason ?? null,
        record.decidedAt
      );
  }

  /**
   * Return all approval records for one run.
   */
  public listByRunId(runId: string): ApprovalDecisionRecord[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            request_id,
            run_id,
            decision,
            reason,
            decided_at
          FROM approvals
          WHERE run_id = ?
          ORDER BY decided_at ASC
        `
      )
      .all(runId) as Array<{
      request_id: string;
      run_id: string;
      decision: ApprovalDecisionRecord["decision"];
      reason: string | null;
      decided_at: string;
    }>;

    return rows.map((row) => ({
      requestId: row.request_id,
      runId: row.run_id,
      decision: row.decision,
      reason: row.reason ?? undefined,
      decidedAt: row.decided_at,
    }));
  }

  /**
   * Return the number of approval decisions for one run.
   */
  public countByRunId(runId: string): number {
    const row = this.db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM approvals
          WHERE run_id = ?
        `
      )
      .get(runId) as { count: number };

    return row.count;
  }
}
