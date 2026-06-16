import { createId } from "../ids.ts";
import type { WorkflowIr } from "../ir.ts";
import type {
  ApprovalState,
  RunState,
  StepRunState,
} from "../state-machines.ts";

export type TriggerKind = "manual" | "schedule" | "webhook";

export type RunRecord = {
  id: string;
  orgId: string;
  state: RunState;
  trigger: TriggerKind;
  triggerMeta: Record<string, unknown> | null;
};

export type StepRunRecord = {
  id: string;
  runId: string;
  stepId: string;
  attempt: number;
  state: StepRunState;
  input: unknown;
  output: unknown;
  error: unknown;
};

export type ApprovalRecord = {
  id: string;
  stepRunId: string;
  state: ApprovalState;
  actorId: string | null;
  comment: string | null;
};

export type AuditRecord = {
  orgId: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export type RunStatePatch = {
  waitingReason?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
};

export type StartStepInput = {
  runId: string;
  stepId: string;
  attempt: number;
  state: StepRunState;
  input?: unknown;
};

export type FinishStepPatch = {
  output?: unknown;
  error?: unknown;
};

export type ApprovalDecisionPatch = {
  actorId?: string;
  comment?: string;
  decidedAt?: Date;
};

// Per-step summary of a run's existing attempts, used to resume after a
// retry-from-failed-step without re-running steps that already succeeded.
export type PriorStep = {
  succeeded: boolean;
  output: unknown;
  maxAttempt: number;
};

export type StepHistory = Record<string, PriorStep>;

// The engine writes only through this interface. Production uses Drizzle
// (@opsline/db); tests use the in-memory store below. Both must always agree
// with what the UI reads.
export interface RunStore {
  loadRun(runId: string): Promise<{ run: RunRecord; ir: WorkflowIr } | null>;
  loadStepHistory(runId: string): Promise<StepHistory>;
  setRunState(
    runId: string,
    state: RunState,
    patch?: RunStatePatch,
  ): Promise<void>;
  startStep(input: StartStepInput): Promise<{ stepRunId: string }>;
  setStepState(stepRunId: string, state: StepRunState): Promise<void>;
  finishStep(
    stepRunId: string,
    state: StepRunState,
    patch?: FinishStepPatch,
  ): Promise<void>;
  createApproval(stepRunId: string): Promise<{ approvalId: string }>;
  setApprovalState(
    approvalId: string,
    state: ApprovalState,
    patch?: ApprovalDecisionPatch,
  ): Promise<void>;
  recordAudit(event: AuditRecord): Promise<void>;
}

export type MemoryRunStore = RunStore & {
  runs: Map<string, RunRecord>;
  stepRuns: Map<string, StepRunRecord>;
  approvals: Map<string, ApprovalRecord>;
  audit: AuditRecord[];
};

export function createMemoryRunStore(seed: {
  run: RunRecord;
  ir: WorkflowIr;
}): MemoryRunStore {
  const runs = new Map<string, RunRecord>([[seed.run.id, { ...seed.run }]]);
  const irs = new Map<string, WorkflowIr>([[seed.run.id, seed.ir]]);
  const stepRuns = new Map<string, StepRunRecord>();
  const approvals = new Map<string, ApprovalRecord>();
  const audit: AuditRecord[] = [];

  return {
    runs,
    stepRuns,
    approvals,
    audit,
    async loadRun(runId) {
      const run = runs.get(runId);
      const ir = irs.get(runId);
      if (!run || !ir) return null;
      return { run, ir };
    },
    async loadStepHistory(runId) {
      const history: StepHistory = {};
      for (const sr of stepRuns.values()) {
        if (sr.runId !== runId) continue;
        const prior = history[sr.stepId] ?? {
          succeeded: false,
          output: null,
          maxAttempt: 0,
        };
        history[sr.stepId] = {
          succeeded: prior.succeeded || sr.state === "succeeded",
          output: sr.state === "succeeded" ? sr.output : prior.output,
          maxAttempt: Math.max(prior.maxAttempt, sr.attempt),
        };
      }
      return history;
    },
    async setRunState(runId, state) {
      const run = runs.get(runId);
      if (run) run.state = state;
    },
    async startStep(input) {
      const stepRunId = createId("stepRun");
      stepRuns.set(stepRunId, {
        id: stepRunId,
        runId: input.runId,
        stepId: input.stepId,
        attempt: input.attempt,
        state: input.state,
        input: input.input ?? null,
        output: null,
        error: null,
      });
      return { stepRunId };
    },
    async setStepState(stepRunId, state) {
      const sr = stepRuns.get(stepRunId);
      if (sr) sr.state = state;
    },
    async finishStep(stepRunId, state, patch) {
      const sr = stepRuns.get(stepRunId);
      if (!sr) return;
      sr.state = state;
      if (patch?.output !== undefined) sr.output = patch.output;
      if (patch?.error !== undefined) sr.error = patch.error;
    },
    async createApproval(stepRunId) {
      const approvalId = createId("approval");
      approvals.set(approvalId, {
        id: approvalId,
        stepRunId,
        state: "requested",
        actorId: null,
        comment: null,
      });
      return { approvalId };
    },
    async setApprovalState(approvalId, state, patch) {
      const a = approvals.get(approvalId);
      if (!a) return;
      a.state = state;
      if (patch?.actorId !== undefined) a.actorId = patch.actorId;
      if (patch?.comment !== undefined) a.comment = patch.comment;
    },
    async recordAudit(event) {
      audit.push(event);
    },
  };
}
