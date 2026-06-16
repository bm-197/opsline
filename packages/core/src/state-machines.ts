export const RUN_STATES = [
  "pending",
  "running",
  "waiting",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type RunState = (typeof RUN_STATES)[number];

export const STEP_RUN_STATES = [
  "pending",
  "running",
  "waiting",
  "succeeded",
  "failed",
  "skipped",
] as const;

export type StepRunState = (typeof STEP_RUN_STATES)[number];

export const APPROVAL_STATES = [
  "requested",
  "approved",
  "rejected",
  "expired",
] as const;

export type ApprovalState = (typeof APPROVAL_STATES)[number];

const runTransitions: Record<RunState, readonly RunState[]> = {
  pending: ["running", "canceled"],
  running: ["waiting", "succeeded", "failed", "canceled"],
  waiting: ["running", "succeeded", "failed", "canceled"],
  succeeded: [],
  failed: [],
  canceled: [],
};

const stepRunTransitions: Record<StepRunState, readonly StepRunState[]> = {
  pending: ["running", "skipped"],
  running: ["waiting", "succeeded", "failed"],
  waiting: ["running", "succeeded", "failed"],
  succeeded: [],
  failed: [],
  skipped: [],
};

const approvalTransitions: Record<ApprovalState, readonly ApprovalState[]> = {
  requested: ["approved", "rejected", "expired"],
  approved: [],
  rejected: [],
  expired: [],
};

export class InvalidTransitionError extends Error {
  readonly machine: string;
  readonly from: string;
  readonly to: string;

  constructor(machine: string, from: string, to: string) {
    super(`invalid ${machine} transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

function makeMachine<S extends string>(
  name: string,
  transitions: Record<S, readonly S[]>,
) {
  return {
    canTransition(from: S, to: S): boolean {
      return transitions[from].includes(to);
    },
    assertTransition(from: S, to: S): void {
      if (!transitions[from].includes(to)) {
        throw new InvalidTransitionError(name, from, to);
      }
    },
    isTerminal(state: S): boolean {
      return transitions[state].length === 0;
    },
  };
}

export const runMachine = makeMachine<RunState>("run", runTransitions);
export const stepRunMachine = makeMachine<StepRunState>(
  "step_run",
  stepRunTransitions,
);
export const approvalMachine = makeMachine<ApprovalState>(
  "approval",
  approvalTransitions,
);
