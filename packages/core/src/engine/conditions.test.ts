import { describe, expect, it } from "vitest";

import { evaluateCondition, getByPath, type RunContext } from "./conditions.ts";

const ctx: RunContext = {
  trigger: { amount: 1500, currency: "USD", flagged: false },
  steps: { fetch: { output: { total: 42, nested: { ok: true } } } },
};

describe("getByPath", () => {
  it("resolves nested paths", () => {
    expect(getByPath(ctx, "trigger.amount")).toBe(1500);
    expect(getByPath(ctx, "steps.fetch.output.total")).toBe(42);
    expect(getByPath(ctx, "steps.fetch.output.nested.ok")).toBe(true);
  });

  it("returns undefined for missing paths", () => {
    expect(getByPath(ctx, "trigger.missing")).toBeUndefined();
    expect(getByPath(ctx, "steps.nope.output")).toBeUndefined();
  });
});

describe("evaluateCondition", () => {
  it("compares numbers", () => {
    expect(
      evaluateCondition(
        { left: { path: "trigger.amount" }, op: "gt", right: 1000 },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { left: { path: "trigger.amount" }, op: "lte", right: 1000 },
        ctx,
      ),
    ).toBe(false);
  });

  it("handles eq/ne", () => {
    expect(
      evaluateCondition(
        { left: { path: "trigger.currency" }, op: "eq", right: "USD" },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { left: { path: "trigger.currency" }, op: "ne", right: "EUR" },
        ctx,
      ),
    ).toBe(true);
  });

  it("handles exists and truthy", () => {
    expect(
      evaluateCondition(
        { left: { path: "trigger.amount" }, op: "exists" },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { left: { path: "trigger.missing" }, op: "exists" },
        ctx,
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        { left: { path: "trigger.flagged" }, op: "truthy" },
        ctx,
      ),
    ).toBe(false);
  });
});
