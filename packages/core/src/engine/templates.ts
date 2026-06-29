import type { Step } from "../ir.ts";
import { getByPath, type RunContext } from "./conditions.ts";

// {{ expression }} templating. The expression is a dotted path into the run
// context, the same grammar branch conditions already use (getByPath), e.g.
// "trigger.amount" or "steps.fetch_invoice.output.body.total". No eval: this is
// pure path lookup, so an expression can never execute arbitrary code.
const TEMPLATE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SINGLE = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Resolve a field that must stay a string. Every {{ expr }} is replaced inline
// with its stringified value; a missing path becomes an empty string.
export function resolveStringField(input: string, context: RunContext): string {
  return input.replace(TEMPLATE, (_, expr: string) =>
    stringify(getByPath(context, expr.trim())),
  );
}

// Resolve any value, preserving types. A string that is exactly one {{ expr }}
// returns the raw resolved value (so a JSON body stays an object or a number);
// mixed text interpolates to a string; objects and arrays resolve deeply.
export function resolveValue(value: unknown, context: RunContext): unknown {
  if (typeof value === "string") {
    const single = SINGLE.exec(value);
    if (single) return getByPath(context, single[1]!.trim());
    return resolveStringField(value, context);
  }
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, context));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveValue(v, context);
    }
    return out;
  }
  return value;
}

// A copy of a step with its config resolved against the run context, ready to
// run. Ids, types, retry, and timing carry no templates and pass through.
export function resolveStepConfig(step: Step, context: RunContext): Step {
  switch (step.type) {
    case "http_request":
      return {
        ...step,
        url: resolveStringField(step.url, context),
        headers: step.headers
          ? Object.fromEntries(
              Object.entries(step.headers).map(([k, v]) => [
                k,
                resolveStringField(v, context),
              ]),
            )
          : undefined,
        body:
          step.body !== undefined
            ? resolveValue(step.body, context)
            : undefined,
      };
    case "send_email":
      return {
        ...step,
        to: resolveStringField(step.to, context),
        subject: resolveStringField(step.subject, context),
        body: resolveStringField(step.body, context),
        from: step.from ? resolveStringField(step.from, context) : undefined,
      };
    case "slack_webhook":
      return {
        ...step,
        webhookUrl: resolveStringField(step.webhookUrl, context),
        text: resolveStringField(step.text, context),
      };
    case "human_approval":
      return { ...step, prompt: resolveStringField(step.prompt, context) };
    default:
      return step;
  }
}
