import { describe, expect, it } from "vitest";

import {
  collectStepIds,
  IrValidationError,
  validateWorkflowIr,
  type WorkflowIr,
} from "./ir";

const validIr: WorkflowIr = {
  name: "Supplier invoice approval",
  steps: [
    {
      id: "fetch_invoice",
      type: "http_request",
      method: "GET",
      url: "https://api.example.com/invoice",
      timeoutMs: 30_000,
    },
    {
      id: "needs_approval",
      type: "branch",
      condition: { left: { path: "trigger.amount" }, op: "gt", right: 1000 },
      then: [
        {
          id: "approve_invoice",
          type: "human_approval",
          prompt: "Approve this invoice?",
        },
      ],
      else: [
        {
          id: "auto_note",
          type: "delay",
          durationMs: 0,
        },
      ],
    },
    {
      id: "notify",
      type: "send_email",
      to: "ops@example.com",
      subject: "Invoice processed",
      body: "Done.",
    },
  ],
};

describe("validateWorkflowIr", () => {
  it("accepts a valid workflow and applies retry defaults are absent unless set", () => {
    const ir = validateWorkflowIr(validIr);
    expect(ir.name).toBe("Supplier invoice approval");
    expect(ir.steps).toHaveLength(3);
  });

  it("fills http_request timeout default", () => {
    const ir = validateWorkflowIr({
      name: "x",
      steps: [
        {
          id: "call",
          type: "http_request",
          method: "POST",
          url: "https://example.com",
        },
      ],
    });
    const step = ir.steps[0];
    expect(step?.type).toBe("http_request");
    if (step?.type === "http_request") expect(step.timeoutMs).toBe(30_000);
  });

  it("rejects an unknown step type", () => {
    expect(() =>
      validateWorkflowIr({
        name: "x",
        steps: [{ id: "a", type: "teleport" }],
      }),
    ).toThrow(IrValidationError);
  });

  it("rejects a non-url http request", () => {
    expect(() =>
      validateWorkflowIr({
        name: "x",
        steps: [{ id: "a", type: "http_request", method: "GET", url: "nope" }],
      }),
    ).toThrow(IrValidationError);
  });

  it("rejects an empty workflow", () => {
    expect(() => validateWorkflowIr({ name: "x", steps: [] })).toThrow(
      IrValidationError,
    );
  });

  it("rejects a bad step id", () => {
    expect(() =>
      validateWorkflowIr({
        name: "x",
        steps: [{ id: "Bad-Id", type: "delay", durationMs: 0 }],
      }),
    ).toThrow(IrValidationError);
  });

  it("rejects duplicate step ids, including inside branch arms", () => {
    expect(() =>
      validateWorkflowIr({
        name: "x",
        steps: [
          { id: "dup", type: "delay", durationMs: 0 },
          {
            id: "b",
            type: "branch",
            condition: { left: { path: "x" }, op: "truthy" },
            then: [{ id: "dup", type: "delay", durationMs: 0 }],
          },
        ],
      }),
    ).toThrow(IrValidationError);
  });

  it("exposes structured issues on failure", () => {
    try {
      validateWorkflowIr({ name: "", steps: [] });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(IrValidationError);
      expect((err as IrValidationError).issues.length).toBeGreaterThan(0);
    }
  });
});

describe("collectStepIds", () => {
  it("enumerates ids in document order through branch arms", () => {
    const ir = validateWorkflowIr(validIr);
    expect(collectStepIds(ir)).toEqual([
      "fetch_invoice",
      "needs_approval",
      "approve_invoice",
      "auto_note",
      "notify",
    ]);
  });
});
