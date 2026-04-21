import type { ApprovalDecisionRecord } from "@control-agent/contracts";
import {
  executeMutation,
  queryAll,
  queryOne,
  type SqliteDatabase,
} from "../db/sqlite";

/**
 * Repository for durable approval records.
 */
export class ApprovalRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  public recordDecision(record: ApprovalDecisionRecord): void {
    executeMutation(
      this.db,
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
      `,
      [
        record.requestId,
        record.runId,
        record.decision,
        record.reason ?? null,
        record.decidedAt,
      ]
    );
  }

  public listByRunId(runId: string): ApprovalDecisionRecord[] {
    const rows = queryAll<{
      request_id: string;
      run_id: string;
      decision: ApprovalDecisionRecord["decision"];
      reason: string | null;
      decided_at: string;
    }>(
      this.db,
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
      `,
      [runId]
    );

    return rows.map((row) => ({
      requestId: row.request_id,
      runId: row.run_id,
      decision: row.decision,
      reason: row.reason ?? undefined,
      decidedAt: row.decided_at,
    }));
  }

  public countByRunId(runId: string): number {
    const row = queryOne<{ count: number }>(
      this.db,
      `
        SELECT COUNT(*) AS count
        FROM approvals
        WHERE run_id = ?
      `,
      [runId]
    );

    return row?.count ?? 0;
  }
}
