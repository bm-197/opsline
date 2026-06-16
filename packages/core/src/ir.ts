import { z } from "zod";

export const STEP_TYPES = [
  "http_request",
  "delay",
  "branch",
  "human_approval",
  "send_email",
  "slack_webhook",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

const stepId = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "step id must be snake_case starting with a letter",
  );

export const retryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  backoff: z
    .object({
      strategy: z.enum(["exponential", "fixed"]).default("exponential"),
      delayMs: z.number().int().min(0).max(3_600_000).default(1_000),
    })
    .default({ strategy: "exponential", delayMs: 1_000 }),
});

export type RetryConfig = z.infer<typeof retryConfigSchema>;

// A reference into run context, e.g. "trigger.amount" or "steps.fetch_invoice.output.total".
const contextRef = z.object({ path: z.string().min(1) });

export const conditionSchema = z.object({
  left: contextRef,
  op: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "exists", "truthy"]),
  right: z.unknown().optional(),
});

export type Condition = z.infer<typeof conditionSchema>;

const baseStepFields = {
  id: stepId,
  name: z.string().min(1).max(120).optional(),
  retry: retryConfigSchema.optional(),
};

const httpRequestStep = z.object({
  ...baseStepFields,
  type: z.literal("http_request"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().min(1).max(300_000).default(30_000),
});

const delayStep = z.object({
  ...baseStepFields,
  type: z.literal("delay"),
  durationMs: z.number().int().min(0).max(2_592_000_000),
});

const humanApprovalStep = z.object({
  ...baseStepFields,
  type: z.literal("human_approval"),
  prompt: z.string().min(1).max(500),
  timeoutMs: z.number().int().min(1).max(2_592_000_000).optional(),
});

const sendEmailStep = z.object({
  ...baseStepFields,
  type: z.literal("send_email"),
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string(),
  from: z.string().optional(),
});

const slackWebhookStep = z.object({
  ...baseStepFields,
  type: z.literal("slack_webhook"),
  webhookUrl: z.string().url(),
  text: z.string().min(1),
});

// branch nests its arms recursively, so its type is declared up front.
export type BranchStep = {
  id: string;
  name?: string;
  retry?: RetryConfig;
  type: "branch";
  condition: Condition;
  then: Step[];
  else?: Step[];
};

export type Step =
  | z.infer<typeof httpRequestStep>
  | z.infer<typeof delayStep>
  | z.infer<typeof humanApprovalStep>
  | z.infer<typeof sendEmailStep>
  | z.infer<typeof slackWebhookStep>
  | BranchStep;

const branchStep: z.ZodType<BranchStep> = z.lazy(() =>
  z.object({
    ...baseStepFields,
    type: z.literal("branch"),
    condition: conditionSchema,
    then: z.array(stepSchema).min(1),
    else: z.array(stepSchema).optional(),
  }),
);

export const stepSchema: z.ZodType<Step> = z.discriminatedUnion("type", [
  httpRequestStep,
  delayStep,
  humanApprovalStep,
  sendEmailStep,
  slackWebhookStep,
  branchStep as unknown as z.ZodObject<{ type: z.ZodLiteral<"branch"> }>,
]) as unknown as z.ZodType<Step>;

export const workflowIrSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    steps: z.array(stepSchema).min(1),
  })
  .superRefine((ir, ctx) => {
    const seen = new Set<string>();
    const walk = (steps: Step[]) => {
      for (const step of steps) {
        if (seen.has(step.id)) {
          ctx.addIssue({
            code: "custom",
            message: `duplicate step id: ${step.id}`,
            path: ["steps"],
          });
        }
        seen.add(step.id);
        if (step.type === "branch") {
          walk(step.then);
          if (step.else) walk(step.else);
        }
      }
    };
    walk(ir.steps);
  });

export type WorkflowIr = z.infer<typeof workflowIrSchema>;

export class IrValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(issues: z.core.$ZodIssue[]) {
    super(`invalid workflow IR: ${issues.length} issue(s)`);
    this.name = "IrValidationError";
    this.issues = issues;
  }
}

export function validateWorkflowIr(input: unknown): WorkflowIr {
  const result = workflowIrSchema.safeParse(input);
  if (!result.success) {
    throw new IrValidationError(result.error.issues);
  }
  return result.data;
}

// Flatten every step id in document order, descending into branch arms.
// The interpreter and audit log use this to enumerate a workflow's steps.
export function collectStepIds(ir: WorkflowIr): string[] {
  const ids: string[] = [];
  const walk = (steps: Step[]) => {
    for (const step of steps) {
      ids.push(step.id);
      if (step.type === "branch") {
        walk(step.then);
        if (step.else) walk(step.else);
      }
    }
  };
  walk(ir.steps);
  return ids;
}
