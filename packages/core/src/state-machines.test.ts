import { describe, expect, it } from "vitest";

import {
  approvalMachine,
  InvalidTransitionError,
  runMachine,
  stepRunMachine,
} from "./state-machines";

describe("runMachine", () => {
  it("allows the documented happy path", () => {
    expect(runMachine.canTransition("pending", "running")).toBe(true);
    expect(runMachine.canTransition("running", "waiting")).toBe(true);
    expect(runMachine.canTransition("waiting", "running")).toBe(true);
    expect(runMachine.canTransition("running", "succeeded")).toBe(true);
  });

  it("allows cancel from every non-terminal state", () => {
    expect(runMachine.canTransition("pending", "canceled")).toBe(true);
    expect(runMachine.canTransition("running", "canceled")).toBe(true);
    expect(runMachine.canTransition("waiting", "canceled")).toBe(true);
  });

  it("treats succeeded, failed, canceled as terminal", () => {
    expect(runMachine.isTerminal("succeeded")).toBe(true);
    expect(runMachine.isTerminal("failed")).toBe(true);
    expect(runMachine.isTerminal("canceled")).toBe(true);
    expect(runMachine.isTerminal("running")).toBe(false);
  });

  it("rejects illegal transitions", () => {
    expect(runMachine.canTransition("succeeded", "running")).toBe(false);
    expect(() => runMachine.assertTransition("pending", "succeeded")).toThrow(
      InvalidTransitionError,
    );
  });
});

describe("stepRunMachine", () => {
  it("allows skip from pending and retry from waiting", () => {
    expect(stepRunMachine.canTransition("pending", "skipped")).toBe(true);
    expect(stepRunMachine.canTransition("waiting", "running")).toBe(true);
  });

  it("does not allow running straight to skipped", () => {
    expect(stepRunMachine.canTransition("running", "skipped")).toBe(false);
  });

  it("treats succeeded, failed, skipped as terminal", () => {
    expect(stepRunMachine.isTerminal("succeeded")).toBe(true);
    expect(stepRunMachine.isTerminal("skipped")).toBe(true);
    expect(stepRunMachine.isTerminal("failed")).toBe(true);
  });
});

describe("approvalMachine", () => {
  it("resolves requested into approved, rejected, or expired", () => {
    expect(approvalMachine.canTransition("requested", "approved")).toBe(true);
    expect(approvalMachine.canTransition("requested", "rejected")).toBe(true);
    expect(approvalMachine.canTransition("requested", "expired")).toBe(true);
  });

  it("cannot move out of a decided state", () => {
    expect(approvalMachine.isTerminal("approved")).toBe(true);
    expect(() =>
      approvalMachine.assertTransition("approved", "rejected"),
    ).toThrow(InvalidTransitionError);
  });
});
