import { describe, expect, it } from "vitest";

import { validateWorkflowIr } from "../ir.ts";
import type { RunContext } from "./conditions.ts";
import {
  resolveStepConfig,
  resolveStringField,
  resolveValue,
} from "./templates.ts";

const ctx: RunContext = {
  trigger: { amount: 4200, name: "Acme" },
  steps: {
    fetch: { output: { status: 200, body: { total: 99, items: ["a", "b"] } } },
  },
};

describe("resolveStringField", () => {
  it("stringifies a lone expression", () => {
    expect(resolveStringField("{{ trigger.amount }}", ctx)).toBe("4200");
  });

  it("interpolates mixed text", () => {
    expect(
      resolveStringField(
        "Invoice ${{ trigger.amount }} for {{ trigger.name }}",
        ctx,
      ),
    ).toBe("Invoice $4200 for Acme");
  });

  it("walks nested paths into step output", () => {
    expect(resolveStringField("{{ steps.fetch.output.body.total }}", ctx)).toBe(
      "99",
    );
  });

  it("renders a missing path as empty string", () => {
    expect(resolveStringField("x={{ trigger.missing }}", ctx)).toBe("x=");
  });

  it("JSON-stringifies an object value", () => {
    expect(resolveStringField("{{ steps.fetch.output.body }}", ctx)).toBe(
      JSON.stringify({ total: 99, items: ["a", "b"] }),
    );
  });
});

describe("resolveValue", () => {
  it("preserves the raw type of a lone expression", () => {
    expect(resolveValue("{{ trigger.amount }}", ctx)).toBe(4200);
    expect(resolveValue("{{ steps.fetch.output.body }}", ctx)).toEqual({
      total: 99,
      items: ["a", "b"],
    });
  });

  it("interpolates a mixed string", () => {
    expect(resolveValue("n={{ trigger.amount }}", ctx)).toBe("n=4200");
  });

  it("resolves objects and arrays deeply", () => {
    expect(
      resolveValue(
        {
          id: "{{ trigger.name }}",
          total: "{{ steps.fetch.output.body.total }}",
          tags: ["{{ trigger.amount }}"],
        },
        ctx,
      ),
    ).toEqual({ id: "Acme", total: 99, tags: [4200] });
  });

  it("passes non-string scalars through", () => {
    expect(resolveValue(5, ctx)).toBe(5);
    expect(resolveValue(true, ctx)).toBe(true);
  });
});

describe("resolveStepConfig", () => {
  it("resolves http_request url, headers, and a typed body", () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "call",
          type: "http_request",
          method: "POST",
          url: "https://x.test/{{ trigger.name }}",
          headers: { "X-Amount": "{{ trigger.amount }}" },
          body: { amount: "{{ trigger.amount }}" },
        },
      ],
    });
    const resolved = resolveStepConfig(ir.steps[0]!, ctx);
    if (resolved.type !== "http_request") throw new Error("wrong type");
    expect(resolved.url).toBe("https://x.test/Acme");
    expect(resolved.headers).toEqual({ "X-Amount": "4200" });
    expect(resolved.body).toEqual({ amount: 4200 });
  });

  it("resolves send_email string fields", () => {
    const ir = validateWorkflowIr({
      name: "wf",
      steps: [
        {
          id: "mail",
          type: "send_email",
          to: "{{ trigger.name }}@x.test",
          subject: "Amount {{ trigger.amount }}",
          body: "{{ trigger.amount }}",
        },
      ],
    });
    const resolved = resolveStepConfig(ir.steps[0]!, ctx);
    if (resolved.type !== "send_email") throw new Error("wrong type");
    expect(resolved.to).toBe("Acme@x.test");
    expect(resolved.subject).toBe("Amount 4200");
    expect(resolved.body).toBe("4200");
  });
});

describe("IR validation with expressions", () => {
  it("accepts a templated url", () => {
    expect(() =>
      validateWorkflowIr({
        name: "wf",
        steps: [
          {
            id: "call",
            type: "http_request",
            method: "GET",
            url: "https://x.test/{{ trigger.id }}",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects a url that is neither valid nor templated", () => {
    expect(() =>
      validateWorkflowIr({
        name: "wf",
        steps: [
          { id: "call", type: "http_request", method: "GET", url: "not a url" },
        ],
      }),
    ).toThrow();
  });

  it("rejects an expression referencing an unknown step", () => {
    expect(() =>
      validateWorkflowIr({
        name: "wf",
        steps: [
          {
            id: "mail",
            type: "send_email",
            to: "a@x.test",
            subject: "hi",
            body: "{{ steps.ghost.output.x }}",
          },
        ],
      }),
    ).toThrow();
  });
});
