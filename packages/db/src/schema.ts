import { APPROVAL_STATES, RUN_STATES, STEP_RUN_STATES } from "@opsline/core";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth-schema.ts";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const triggerEnum = pgEnum("run_trigger", [
  "manual",
  "schedule",
  "webhook",
]);
export const runStateEnum = pgEnum("run_state", RUN_STATES);
export const stepRunStateEnum = pgEnum("step_run_state", STEP_RUN_STATES);
export const approvalStateEnum = pgEnum("approval_state", APPROVAL_STATES);

export const workflows = pgTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    cron: text("cron"),
    ...timestamps,
  },
  (t) => [unique().on(t.orgId, t.slug)],
);

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    ir: jsonb("ir").notNull(),
    createdBy: text("created_by").references(() => user.id),
    ...timestamps,
  },
  (t) => [unique().on(t.workflowId, t.version)],
);

export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  workflowVersionId: text("workflow_version_id")
    .notNull()
    .references(() => workflowVersions.id, { onDelete: "cascade" }),
  trigger: triggerEnum("trigger").notNull(),
  triggerMeta: jsonb("trigger_meta"),
  inngestRunId: text("inngest_run_id"),
  state: runStateEnum("state").notNull().default("pending"),
  waitingReason: text("waiting_reason"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...timestamps,
});

export const stepRuns = pgTable("step_runs", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  stepId: text("step_id").notNull(),
  attempt: integer("attempt").notNull().default(1),
  state: stepRunStateEnum("state").notNull().default("pending"),
  input: jsonb("input"),
  output: jsonb("output"),
  error: jsonb("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...timestamps,
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  stepRunId: text("step_run_id")
    .notNull()
    .references(() => stepRuns.id, { onDelete: "cascade" }),
  state: approvalStateEnum("state").notNull().default("requested"),
  actorId: text("actor_id").references(() => user.id),
  comment: text("comment"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  ...timestamps,
});

// Append-only. updated_at exists to satisfy the table convention but never moves.
export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  hmacSecret: text("hmac_secret").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  ...timestamps,
});

// Replay protection for inbound webhooks: a signature seen before is rejected.
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  signature: text("signature").notNull().unique(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...timestamps,
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hashedKey: text("hashed_key").notNull().unique(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  ...timestamps,
});

export const schema = {
  workflows,
  workflowVersions,
  runs,
  stepRuns,
  approvals,
  auditEvents,
  webhookEndpoints,
  webhookDeliveries,
  apiKeys,
};
