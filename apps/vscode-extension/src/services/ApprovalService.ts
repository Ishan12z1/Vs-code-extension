import type {
  ActionPreview,
  ApprovalDecision,
  ApprovalDecisionRecord,
  ApprovalRequest,
  RiskLevel,
  SurfaceAction,
} from "@control-agent/contracts";
import { ApprovalRepository } from "../persistence/repositories/ApprovalRepository";

/**
 * Small input object for creating one approval request.
 *
 * Why this exists:
 * - keeps the public service method explicit
 * - avoids a long positional-argument constructor-like API
 */
export interface CreateApprovalRequestInput {
  readonly runId: string;
  readonly action: SurfaceAction;
  readonly riskLevel: RiskLevel;
  readonly reason: string;
  readonly preview?: ActionPreview;
}

/**
 * Service responsible for approval request lifecycle.
 *
 * Phase 6.2 scope:
 * - create approval requests
 * - persist decision records
 * - read pending requests
 *
 * Later phases will connect this service to:
 * - runtime pause/resume
 * - sidebar approval UI
 */
export class ApprovalService {
  public constructor(private readonly approvalRepository: ApprovalRepository) {}

  /**
   * Create and persist one approval request.
   *
   * Important:
   * - phase 6.2 happens before the full tool registry exists
   * - so toolName is derived from surface + operation for now
   * - later this can switch to a real tool identity if needed
   */
  public createApprovalRequest(
    input: CreateApprovalRequestInput
  ): ApprovalRequest {
    const request: ApprovalRequest = {
      requestId: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      runId: input.runId,
      toolName: this.buildToolName(input.action),
      targetLabel: this.buildTargetLabel(input.action),
      riskLevel: input.riskLevel,
      reason: input.reason,
      previewSummary: input.preview?.summary,
      createdAt: new Date().toISOString(),
    };

    this.approvalRepository.createRequest(request);

    return request;
  }

  /**
   * Approve one request and persist the resulting decision.
   */
  public approveRequest(
    requestId: string,
    runId: string,
    reason?: string
  ): ApprovalDecisionRecord {
    return this.recordDecision(requestId, runId, "approved", reason);
  }

  /**
   * Reject one request and persist the resulting decision.
   */
  public rejectRequest(
    requestId: string,
    runId: string,
    reason?: string
  ): ApprovalDecisionRecord {
    return this.recordDecision(requestId, runId, "rejected", reason);
  }

  /**
   * Cancel one request and persist the resulting decision.
   */
  public cancelRequest(
    requestId: string,
    runId: string,
    reason?: string
  ): ApprovalDecisionRecord {
    return this.recordDecision(requestId, runId, "cancelled", reason);
  }

  /**
   * Return one approval request by id.
   */
  public getRequest(requestId: string): ApprovalRequest | null {
    return this.approvalRepository.getRequestById(requestId);
  }

  /**
   * Return all approval requests for one run.
   */
  public listRequestsForRun(runId: string): ApprovalRequest[] {
    return this.approvalRepository.listRequestsByRunId(runId);
  }

  /**
   * Return pending approval requests for one run.
   */
  public listPendingRequestsForRun(runId: string): ApprovalRequest[] {
    return this.approvalRepository.listPendingRequestsByRunId(runId);
  }

  /**
   * Return one approval decision by request id.
   */
  public getDecision(requestId: string): ApprovalDecisionRecord | null {
    return this.approvalRepository.getDecisionByRequestId(requestId);
  }

  /**
   * Internal helper for recording a decision.
   */
  private recordDecision(
    requestId: string,
    runId: string,
    decision: ApprovalDecision,
    reason?: string
  ): ApprovalDecisionRecord {
    const record: ApprovalDecisionRecord = {
      requestId,
      runId,
      decision,
      reason,
      decidedAt: new Date().toISOString(),
    };

    this.approvalRepository.recordDecision(record);

    return record;
  }

  /**
   * Temporary tool identity derivation.
   *
   * Later, when the tool registry is real, this can be replaced with
   * a first-class tool name from the runtime/tool layer.
   */
  private buildToolName(action: SurfaceAction): string {
    return `${action.surface}.${action.operation}`;
  }

  /**
   * Build a human-readable target label for approval UI and logs.
   */
  private buildTargetLabel(action: SurfaceAction): string {
    return `${action.surface}: ${action.target}`;
  }
}
