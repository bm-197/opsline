import { z } from "zod";

export const RUN_REQUESTED = "opsline/run.requested";
export const APPROVAL_DECIDED = "opsline/approval.decided";
export const RUN_CANCELED = "opsline/run.canceled";

export const runRequestedData = z.object({ runId: z.string() });

export const approvalDecidedData = z.object({
  stepRunId: z.string(),
  runId: z.string().optional(),
  decision: z.enum(["approved", "rejected"]),
  actorId: z.string().optional(),
  comment: z.string().optional(),
});

export const runCanceledData = z.object({
  runId: z.string(),
  actorId: z.string().optional(),
});

export type RunRequestedData = z.infer<typeof runRequestedData>;
export type ApprovalDecidedData = z.infer<typeof approvalDecidedData>;
export type RunCanceledData = z.infer<typeof runCanceledData>;
