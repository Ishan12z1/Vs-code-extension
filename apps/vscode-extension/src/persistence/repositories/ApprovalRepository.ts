import type {
  ApprovalDecisionRecord,
  ApprovalRequest,
} from "@control-agent/contracts";
import {
  executeMutation,
  queryAll,
  queryOne,
  type SqliteDatabase,
} from "../db/sqlite";

/**
 * Repository for approval requests and approval decisions.
 *
 * Why this repository owns both:
 * - requests and decisions are one lifecycle
 * - the runtime and UI usually need both together
 * - it keeps approval persistence in one place
 */
export class ApprovalRepository {
  public constructor(private readonly db: SqliteDatabase) {}

  /**
   * Persist one approval request.
   *
   * Why upsert:
   * - keeps the write path idempotent while the runtime is still evolving
   */
  public createRequest(request: ApprovalRequest): void {
    executeMutation(
      this.db,
      `
        INSERT INTO approval_requests (
          request_id,
          run_id,
          tool_name,
          target_label,
          risk_level,
          reason,
          preview_summary,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(request_id) DO UPDATE SET
          run_id = excluded.run_id,
          tool_name = excluded.tool_name,
          target_label = excluded.target_label,
          risk_level = excluded.risk_level,
          reason = excluded.reason,
          preview_summary = excluded.preview_summary,
          created_at = excluded.created_at
      `,
      [
        request.requestId,
        request.runId,
        request.toolName,
        request.targetLabel,
        request.riskLevel,
        request.reason,
        request.previewSummary ?? null,
        request.createdAt,
      ]
    );
  }

  /**
   * Read one approval request by id.
   */
  public getRequestById(requestId: string): ApprovalRequest | null {
    const row = queryOne<{
      request_id: string;
      run_id: string;
      tool_name: string;
      target_label: string;
      risk_level: ApprovalRequest["riskLevel"];
      reason: string;
      preview_summary: string | null;
      created_at: string;
    }>(
      this.db,
      `
        SELECT
          request_id,
          run_id,
          tool_name,
          target_label,
          risk_level,
          reason,
          preview_summary,
          created_at
        FROM approval_requests
        WHERE request_id = ?
        LIMIT 1
      `,
      [requestId]
    );

    if (!row) {
      return null;
    }

    return {
      requestId: row.request_id,
      runId: row.run_id,
      toolName: row.tool_name,
      targetLabel: row.target_label,
      riskLevel: row.risk_level,
      reason: row.reason,
      previewSummary: row.preview_summary ?? undefined,
      createdAt: row.created_at,
    };
  }

  /**
   * Return all approval requests for one run.
   */
  public listRequestsByRunId(runId: string): ApprovalRequest[] {
    const rows = queryAll<{
      request_id: string;
      run_id: string;
      tool_name: string;
      target_label: string;
      risk_level: ApprovalRequest["riskLevel"];
      reason: string;
      preview_summary: string | null;
      created_at: string;
    }>(
      this.db,
      `
        SELECT
          request_id,
          run_id,
          tool_name,
          target_label,
          risk_level,
          reason,
          preview_summary,
          created_at
        FROM approval_requests
        WHERE run_id = ?
        ORDER BY created_at ASC
      `,
      [runId]
    );

    return rows.map((row) => ({
      requestId: row.request_id,
      runId: row.run_id,
      toolName: row.tool_name,
      targetLabel: row.target_label,
      riskLevel: row.risk_level,
      reason: row.reason,
      previewSummary: row.preview_summary ?? undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Return approval requests that do not yet have a recorded decision.
   *
   * Why this matters:
   * - the runtime will need pending approvals later
   * - the UI will eventually need to list what still needs attention
   */
  public listPendingRequestsByRunId(runId: string): ApprovalRequest[] {
    const rows = queryAll<{
      request_id: string;
      run_id: string;
      tool_name: string;
      target_label: string;
      risk_level: ApprovalRequest["riskLevel"];
      reason: string;
      preview_summary: string | null;
      created_at: string;
    }>(
      this.db,
      `
        SELECT
          ar.request_id,
          ar.run_id,
          ar.tool_name,
          ar.target_label,
          ar.risk_level,
          ar.reason,
          ar.preview_summary,
          ar.created_at
        FROM approval_requests ar
        LEFT JOIN approvals ad
          ON ad.request_id = ar.request_id
        WHERE ar.run_id = ?
          AND ad.request_id IS NULL
        ORDER BY ar.created_at ASC
      `,
      [runId]
    );

    return rows.map((row) => ({
      requestId: row.request_id,
      runId: row.run_id,
      toolName: row.tool_name,
      targetLabel: row.target_label,
      riskLevel: row.risk_level,
      reason: row.reason,
      previewSummary: row.preview_summary ?? undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Persist one approval decision record.
   */
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

  /**
   * Read one approval decision by request id.
   */
  public getDecisionByRequestId(
    requestId: string
  ): ApprovalDecisionRecord | null {
    const row = queryOne<{
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
        WHERE request_id = ?
        LIMIT 1
      `,
      [requestId]
    );

    if (!row) {
      return null;
    }

    return {
      requestId: row.request_id,
      runId: row.run_id,
      decision: row.decision,
      reason: row.reason ?? undefined,
      decidedAt: row.decided_at,
    };
  }

  /**
   * Return all approval decisions for one run.
   */
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

  /**
   * Return the number of approval decisions for one run.
   */
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
