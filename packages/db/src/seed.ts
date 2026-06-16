import {
  createId,
  validateWorkflowIr,
  type ApprovalState,
  type RunState,
  type StepRunState,
  type WorkflowIr,
} from "@opsline/core";

import { member, organization, user } from "./auth-schema.ts";
import { createClient } from "./client.ts";
import {
  apiKeys,
  approvals,
  auditEvents,
  runs,
  stepRuns,
  webhookEndpoints,
  workflows,
  workflowVersions,
} from "./schema.ts";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000);

const invoiceIr: WorkflowIr = validateWorkflowIr({
  name: "Supplier invoice approval",
  description:
    "Example workflow (seeded). Fetch an invoice, get a human ok over a threshold, then notify finance.",
  steps: [
    {
      id: "fetch_invoice",
      type: "http_request",
      method: "GET",
      url: "https://example.com",
    },
    {
      id: "check_amount",
      type: "branch",
      condition: { left: { path: "trigger.amount" }, op: "gt", right: 1000 },
      then: [
        {
          id: "approve_invoice",
          type: "human_approval",
          prompt: "This invoice is over 1000. Approve payment?",
          timeoutMs: 172_800_000,
        },
      ],
      else: [{ id: "auto_clear", type: "delay", durationMs: 0 }],
    },
    {
      id: "notify_finance",
      type: "send_email",
      to: "finance@northwind.example",
      subject: "Invoice cleared for payment",
      body: "The attached invoice has been approved and is cleared for payment.",
    },
  ],
});

const reportIr: WorkflowIr = validateWorkflowIr({
  name: "Daily report pipeline",
  description:
    "Example workflow (seeded). Pull metrics, let them settle, email the report, post to Slack.",
  steps: [
    {
      id: "pull_metrics",
      type: "http_request",
      method: "GET",
      url: "https://api.example.com/metrics/daily",
    },
    { id: "wait_settle", type: "delay", durationMs: 300_000 },
    {
      id: "email_report",
      type: "send_email",
      to: "ops@northwind.example",
      subject: "Daily report",
      body: "Your daily report is ready.",
    },
    {
      id: "post_slack",
      type: "slack_webhook",
      webhookUrl: "https://hooks.slack.example/services/seed",
      text: "Daily report posted.",
    },
  ],
});

// A workflow whose steps all reach real endpoints (example.com returns 200,
// email is the console transport), so it can be triggered live and driven
// through the approval loop end to end.
const approvalDemoIr: WorkflowIr = validateWorkflowIr({
  name: "Approval demo",
  description:
    "Example workflow (seeded). A clean trigger to approval to email loop you can run live.",
  steps: [
    {
      id: "check",
      type: "http_request",
      method: "GET",
      url: "https://example.com",
    },
    {
      id: "approve",
      type: "human_approval",
      prompt: "A demo run is waiting. Approve it to send the email.",
    },
    {
      id: "notify",
      type: "send_email",
      to: "ops@northwind.example",
      subject: "Demo run approved",
      body: "The approval demo completed.",
    },
  ],
});

async function main() {
  const { db, sql } = createClient();

  // Idempotent: clear everything so `pnpm db:seed` is repeatable from scratch.
  await sql`
    truncate
      ${sql(["audit_events"])}, ${sql(["approvals"])}, ${sql(["step_runs"])},
      ${sql(["runs"])}, ${sql(["workflow_versions"])}, ${sql(["webhook_endpoints"])},
      ${sql(["workflows"])}, ${sql(["api_keys"])},
      ${sql(["member"])}, ${sql(["invitation"])}, ${sql(["session"])},
      ${sql(["account"])}, ${sql(["verification"])}, ${sql(["organization"])},
      ${sql(["user"])}
    restart identity cascade
  `;

  const orgId = createId("organization");
  await db.insert(organization).values({
    id: orgId,
    name: "Northwind Ops (demo)",
    slug: "northwind",
  });

  const userId = createId("user");
  await db.insert(user).values({
    id: userId,
    email: "operator@northwind.example",
    name: "Demo Operator",
    emailVerified: true,
  });

  // Login itself arrives in M5, so the demo user has no credential account yet.
  await db.insert(member).values({
    id: createId("membership"),
    organizationId: orgId,
    userId,
    role: "admin",
  });

  await db.insert(apiKeys).values({
    id: createId("apiKey"),
    orgId,
    name: "Seed API key",
    hashedKey: `seed_${createId("apiKey")}`,
  });

  // Workflows + immutable version snapshots.
  const invoiceWfId = createId("workflow");
  const reportWfId = createId("workflow");
  const demoWfId = createId("workflow");
  await db.insert(workflows).values([
    {
      id: invoiceWfId,
      orgId,
      name: invoiceIr.name,
      slug: "supplier-invoice-approval",
      description: invoiceIr.description,
    },
    {
      id: reportWfId,
      orgId,
      name: reportIr.name,
      slug: "daily-report-pipeline",
      description: reportIr.description,
      cron: "0 8 * * *",
    },
    {
      id: demoWfId,
      orgId,
      name: approvalDemoIr.name,
      slug: "approval-demo",
      description: approvalDemoIr.description,
    },
  ]);

  const invoiceVersionId = createId("workflowVersion");
  const reportVersionId = createId("workflowVersion");
  await db.insert(workflowVersions).values([
    {
      id: invoiceVersionId,
      workflowId: invoiceWfId,
      version: 1,
      ir: invoiceIr,
      createdBy: userId,
    },
    {
      id: reportVersionId,
      workflowId: reportWfId,
      version: 1,
      ir: reportIr,
      createdBy: userId,
    },
    {
      id: createId("workflowVersion"),
      workflowId: demoWfId,
      version: 1,
      ir: approvalDemoIr,
      createdBy: userId,
    },
  ]);

  await db.insert(webhookEndpoints).values({
    id: createId("webhookEndpoint"),
    workflowId: invoiceWfId,
    token: `whts_${createId("webhookEndpoint")}`,
    hmacSecret: `whsec_${createId("webhookEndpoint")}`,
  });

  const audit: (typeof auditEvents.$inferInsert)[] = [];
  const recordRunState = (
    runId: string,
    after: string,
    at: Date,
    actor = "system",
  ) =>
    audit.push({
      id: createId("auditEvent"),
      orgId,
      actor,
      action: `run.${after}`,
      entityType: "run",
      entityId: runId,
      after: { state: after },
      at,
    });

  type SeedStep = {
    stepId: string;
    attempt?: number;
    state: StepRunState;
    output?: unknown;
    error?: unknown;
    startedAt?: Date;
    finishedAt?: Date;
  };

  type SeedRun = {
    versionId: string;
    trigger: "manual" | "schedule" | "webhook";
    state: RunState;
    waitingReason?: string;
    startedAt?: Date;
    finishedAt?: Date;
    minsAgo: number;
    steps: SeedStep[];
    approval?: {
      state: ApprovalState;
      onStepId: string;
      comment?: string;
      decidedAt?: Date;
    };
  };

  const seedRuns: SeedRun[] = [
    {
      versionId: invoiceVersionId,
      trigger: "webhook",
      state: "succeeded",
      minsAgo: 320,
      startedAt: minutesAgo(320),
      finishedAt: minutesAgo(318),
      steps: [
        {
          stepId: "fetch_invoice",
          state: "succeeded",
          output: { amount: 4200 },
        },
        { stepId: "approve_invoice", state: "succeeded" },
        { stepId: "notify_finance", state: "succeeded" },
      ],
      approval: {
        state: "approved",
        onStepId: "approve_invoice",
        comment: "Looks right, approved.",
        decidedAt: minutesAgo(319),
      },
    },
    {
      versionId: invoiceVersionId,
      trigger: "manual",
      state: "failed",
      minsAgo: 200,
      startedAt: minutesAgo(200),
      finishedAt: minutesAgo(199),
      steps: [
        {
          stepId: "fetch_invoice",
          attempt: 1,
          state: "failed",
          error: { message: "503 from upstream" },
        },
        {
          stepId: "fetch_invoice",
          attempt: 2,
          state: "failed",
          error: { message: "503 from upstream" },
        },
        {
          stepId: "fetch_invoice",
          attempt: 3,
          state: "failed",
          error: { message: "503 from upstream" },
        },
      ],
    },
    {
      versionId: invoiceVersionId,
      trigger: "webhook",
      state: "waiting",
      waitingReason: "Awaiting approval on approve_invoice",
      minsAgo: 30,
      startedAt: minutesAgo(30),
      steps: [
        {
          stepId: "fetch_invoice",
          state: "succeeded",
          output: { amount: 8800 },
        },
        { stepId: "approve_invoice", state: "waiting" },
      ],
      approval: { state: "requested", onStepId: "approve_invoice" },
    },
    {
      versionId: invoiceVersionId,
      trigger: "webhook",
      state: "failed",
      minsAgo: 140,
      startedAt: minutesAgo(140),
      finishedAt: minutesAgo(120),
      steps: [
        {
          stepId: "fetch_invoice",
          state: "succeeded",
          output: { amount: 15000 },
        },
        { stepId: "approve_invoice", state: "failed" },
      ],
      approval: {
        state: "rejected",
        onStepId: "approve_invoice",
        comment: "Duplicate of last week's invoice.",
        decidedAt: minutesAgo(121),
      },
    },
    {
      versionId: invoiceVersionId,
      trigger: "webhook",
      state: "failed",
      minsAgo: 600,
      startedAt: minutesAgo(600),
      finishedAt: minutesAgo(360),
      steps: [
        {
          stepId: "fetch_invoice",
          state: "succeeded",
          output: { amount: 2300 },
        },
        { stepId: "approve_invoice", state: "failed" },
      ],
      approval: {
        state: "expired",
        onStepId: "approve_invoice",
        decidedAt: minutesAgo(360),
      },
    },
    {
      versionId: reportVersionId,
      trigger: "schedule",
      state: "succeeded",
      minsAgo: 1440,
      startedAt: minutesAgo(1440),
      finishedAt: minutesAgo(1438),
      steps: [
        { stepId: "pull_metrics", state: "succeeded", output: { rows: 128 } },
        { stepId: "wait_settle", state: "succeeded" },
        { stepId: "email_report", state: "succeeded" },
        { stepId: "post_slack", state: "succeeded" },
      ],
    },
    {
      versionId: reportVersionId,
      trigger: "schedule",
      state: "running",
      minsAgo: 5,
      startedAt: minutesAgo(5),
      steps: [
        { stepId: "pull_metrics", state: "succeeded", output: { rows: 131 } },
        { stepId: "wait_settle", state: "running" },
      ],
    },
    {
      versionId: reportVersionId,
      trigger: "manual",
      state: "canceled",
      minsAgo: 80,
      startedAt: minutesAgo(80),
      finishedAt: minutesAgo(79),
      steps: [
        { stepId: "pull_metrics", state: "succeeded", output: { rows: 90 } },
        { stepId: "wait_settle", state: "skipped" },
      ],
    },
    {
      versionId: invoiceVersionId,
      trigger: "webhook",
      state: "pending",
      minsAgo: 1,
      steps: [],
    },
  ];

  for (const r of seedRuns) {
    const runId = createId("run");
    await db.insert(runs).values({
      id: runId,
      workflowVersionId: r.versionId,
      trigger: r.trigger,
      triggerMeta: { seeded: true },
      inngestRunId: `seed_${createId("run")}`,
      state: r.state,
      waitingReason: r.waitingReason ?? null,
      startedAt: r.startedAt ?? null,
      finishedAt: r.finishedAt ?? null,
    });
    recordRunState(runId, "pending", minutesAgo(r.minsAgo + 1));
    if (r.state !== "pending") {
      recordRunState(runId, r.state, minutesAgo(r.minsAgo));
    }

    const stepIdByName = new Map<string, string>();
    for (const s of r.steps) {
      const stepRunId = createId("stepRun");
      stepIdByName.set(s.stepId, stepRunId);
      await db.insert(stepRuns).values({
        id: stepRunId,
        runId,
        stepId: s.stepId,
        attempt: s.attempt ?? 1,
        state: s.state,
        output: s.output ?? null,
        error: s.error ?? null,
        startedAt: s.startedAt ?? r.startedAt ?? null,
        finishedAt: s.finishedAt ?? r.finishedAt ?? null,
      });
    }

    if (r.approval) {
      const stepRunId = stepIdByName.get(r.approval.onStepId);
      if (stepRunId) {
        await db.insert(approvals).values({
          id: createId("approval"),
          stepRunId,
          state: r.approval.state,
          actorId: r.approval.state === "requested" ? null : userId,
          comment: r.approval.comment ?? null,
          decidedAt: r.approval.decidedAt ?? null,
        });
        audit.push({
          id: createId("auditEvent"),
          orgId,
          actor: r.approval.state === "requested" ? "system" : userId,
          action: `approval.${r.approval.state}`,
          entityType: "approval",
          entityId: stepRunId,
          after: { state: r.approval.state },
          at: r.approval.decidedAt ?? minutesAgo(r.minsAgo),
        });
      }
    }
  }

  await db.insert(auditEvents).values(audit);

  await sql.end();
  console.log(
    `seeded: 1 org, 1 user, 3 workflows, ${seedRuns.length} runs, ${audit.length} audit events`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
