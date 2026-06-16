import type { StepType, WorkflowIr } from "@opsline/core";

// The editor works on a flat draft (linear-only v1, no branch). The server
// turns it into a validated WorkflowIr on publish.
export type DraftStep = {
  key: string; // client-only React key
  type: Exclude<StepType, "branch">;
  name?: string;
  // http_request / slack_webhook
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url?: string;
  timeoutMs?: number;
  webhookUrl?: string;
  text?: string;
  // delay
  durationMs?: number;
  // human_approval
  prompt?: string;
  // send_email
  to?: string;
  subject?: string;
  body?: string;
  from?: string;
  // advanced retry (http_request / send_email / slack_webhook)
  maxAttempts?: number;
  backoffStrategy?: "exponential" | "fixed";
  backoffDelayMs?: number;
};

export type DraftWorkflow = {
  name: string;
  description?: string;
  cron: string; // "" = no schedule
  webhookEnabled: boolean;
  steps: DraftStep[];
};

export const STEP_TYPE_LABELS: Record<DraftStep["type"], string> = {
  http_request: "HTTP request",
  delay: "Delay",
  human_approval: "Human approval",
  send_email: "Send email",
  slack_webhook: "Slack webhook",
};

let counter = 0;
export function blankStep(type: DraftStep["type"]): DraftStep {
  counter += 1;
  const base: DraftStep = { key: `s${counter}_${type}`, type };
  if (type === "http_request") return { ...base, method: "GET", url: "" };
  if (type === "delay") return { ...base, durationMs: 0 };
  if (type === "human_approval") return { ...base, prompt: "" };
  if (type === "send_email") return { ...base, to: "", subject: "", body: "" };
  return { ...base, webhookUrl: "", text: "" };
}

// Pure: build the IR input from a draft. Step ids are positional and stable
// within a version; validateWorkflowIr (server-side) is the gate.
export function draftToIrInput(draft: DraftWorkflow): unknown {
  const steps = draft.steps.map((s, i) => {
    const id = `step_${i + 1}`;
    const name = s.name?.trim() ? { name: s.name.trim() } : {};
    const retry =
      s.maxAttempts && s.maxAttempts > 0
        ? {
            retry: {
              maxAttempts: s.maxAttempts,
              backoff: {
                strategy: s.backoffStrategy ?? "exponential",
                delayMs: s.backoffDelayMs ?? 1000,
              },
            },
          }
        : {};
    switch (s.type) {
      case "http_request":
        return {
          id,
          ...name,
          type: "http_request",
          method: s.method ?? "GET",
          url: s.url,
          ...(s.timeoutMs ? { timeoutMs: s.timeoutMs } : {}),
          ...retry,
        };
      case "delay":
        return { id, ...name, type: "delay", durationMs: s.durationMs ?? 0 };
      case "human_approval":
        return {
          id,
          ...name,
          type: "human_approval",
          prompt: s.prompt,
          ...(s.timeoutMs ? { timeoutMs: s.timeoutMs } : {}),
        };
      case "send_email":
        return {
          id,
          ...name,
          type: "send_email",
          to: s.to,
          subject: s.subject,
          body: s.body,
          ...(s.from?.trim() ? { from: s.from.trim() } : {}),
          ...retry,
        };
      case "slack_webhook":
        return {
          id,
          ...name,
          type: "slack_webhook",
          webhookUrl: s.webhookUrl,
          text: s.text,
          ...retry,
        };
    }
  });
  return {
    name: draft.name,
    ...(draft.description?.trim()
      ? { description: draft.description.trim() }
      : {}),
    steps,
  };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workflow"
  );
}

// Turn a stored WorkflowIr (e.g. latest version) back into an editable draft.
// Branch steps can't be edited in v1, so a workflow containing one is flagged.
export function irToDraft(
  ir: WorkflowIr,
  meta: { cron: string | null; webhookEnabled: boolean },
): { draft: DraftWorkflow; editable: boolean } {
  const editable = ir.steps.every((s) => s.type !== "branch");
  const steps: DraftStep[] = ir.steps
    .filter((s) => s.type !== "branch")
    .map((s, i) => {
      const base: DraftStep = {
        key: `e${i}_${s.type}`,
        type: s.type as DraftStep["type"],
        name: s.name,
      };
      if (s.type === "http_request")
        return {
          ...base,
          method: s.method,
          url: s.url,
          timeoutMs: s.timeoutMs,
        };
      if (s.type === "delay") return { ...base, durationMs: s.durationMs };
      if (s.type === "human_approval")
        return { ...base, prompt: s.prompt, timeoutMs: s.timeoutMs };
      if (s.type === "send_email")
        return {
          ...base,
          to: s.to,
          subject: s.subject,
          body: s.body,
          from: s.from,
        };
      if (s.type === "slack_webhook")
        return { ...base, webhookUrl: s.webhookUrl, text: s.text };
      return base;
    });
  return {
    draft: {
      name: ir.name,
      description: ir.description,
      cron: meta.cron ?? "",
      webhookEnabled: meta.webhookEnabled,
      steps,
    },
    editable,
  };
}
