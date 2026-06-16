import type { Condition } from "../ir.ts";

export type RunContext = {
  trigger: Record<string, unknown>;
  steps: Record<string, { output?: unknown }>;
};

// Resolve a dotted path like "trigger.amount" or "steps.fetch_invoice.output.total".
export function getByPath(context: RunContext, path: string): unknown {
  let current: unknown = context;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function evaluateCondition(
  condition: Condition,
  context: RunContext,
): boolean {
  const left = getByPath(context, condition.left.path);
  const right = condition.right;

  switch (condition.op) {
    case "exists":
      return left !== undefined && left !== null;
    case "truthy":
      return Boolean(left);
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "gt":
      return (left as number) > (right as number);
    case "lt":
      return (left as number) < (right as number);
    case "gte":
      return (left as number) >= (right as number);
    case "lte":
      return (left as number) <= (right as number);
  }
}
