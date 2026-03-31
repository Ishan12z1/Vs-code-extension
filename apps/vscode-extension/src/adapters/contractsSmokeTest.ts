import { PlanRequestSchema } from "@control-agent/contracts";

export function validatePlanRequestPayload(payload: unknown): boolean {
  const result = PlanRequestSchema.safeParse(payload);
  return result.success;
}
