import {
  PlanRequestSchema,
  PlanResponseSchema,
  type PlanResponse,
  type RequestClass,
} from "@control-agent/contracts";
import { createDefaultInspectors } from "../inspectors/createDefaultInspectors";
import { WorkspaceSnapshotBuilder } from "../inspectors/WorkspaceSnapshotBuilder";
import type { ExtensionRuntime } from "../state/runtime";

export async function requestPlannerResponse(options: {
  runtime: ExtensionRuntime;
  backendUrl: string;
  prompt: string;
  requestClassHint?: RequestClass;
}): Promise<PlanResponse> {
  const builder = new WorkspaceSnapshotBuilder(
    options.runtime,
    createDefaultInspectors()
  );

  const workspaceSnapshot = await builder.build();

  const requestPayload = PlanRequestSchema.parse({
    userRequest: {
      id: `req-${Date.now()}`,
      text: options.prompt,
      requestClassHint: options.requestClassHint,
      createdAt: new Date().toISOString(),
    },
    workspaceSnapshot,
  });

  const response = await fetch(`${options.backendUrl}/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  let responseJson: unknown;

  try {
    responseJson = await response.json();
  } catch {
    throw new Error(
      `Planner backend returned a non-JSON response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Planner backend request failed with status ${response.status}.`
    );
  }

  return PlanResponseSchema.parse(responseJson);
}
