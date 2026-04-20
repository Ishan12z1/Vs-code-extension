import { z } from "zod";
import { RunStatusSchema } from "./runtime";

export const TraceEventSchema = z.object({
  eventId: z.string().min(1),
  runId: z.string().min(1),
  type: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

export const RunHistoryEntrySchema = z.object({
  runId: z.string().min(1),
  goalText: z.string().min(1),
  status: RunStatusSchema,
  stepCount: z.number().int().nonnegative().default(0),
  approvalCount: z.number().int().nonnegative().default(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  summary: z.string().min(1).optional(),
});

export type RunHistoryEntry = z.infer<typeof RunHistoryEntrySchema>;
