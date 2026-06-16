// A minimal 5-field cron matcher (minute hour day-of-month month day-of-week),
// evaluated in UTC to match Inngest's cron semantics. Supports `*`, single
// numbers, `a-b` ranges, comma lists, and `*/step` or `a-b/step`. Day-of-month
// and day-of-week are ANDed (documented simplification, not the OR variant).

const FIELDS: Array<[min: number, max: number]> = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0 and 7 = Sunday)
];

function parseField(field: string, min: number, max: number): Set<number> {
  const allowed = new Set<number>();
  for (const part of field.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`invalid cron step in "${field}"`);
    }
    let lo = min;
    let hi = max;
    if (rangePart && rangePart !== "*") {
      const [a, b] = rangePart.split("-");
      lo = Number(a);
      hi = b !== undefined ? Number(b) : lo;
      if (
        !Number.isInteger(lo) ||
        !Number.isInteger(hi) ||
        lo < min ||
        hi > max
      ) {
        throw new Error(`invalid cron range in "${field}"`);
      }
    }
    for (let n = lo; n <= hi; n += step) allowed.add(n);
  }
  return allowed;
}

export function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  try {
    fields.forEach((f, i) => parseField(f, FIELDS[i]![0], FIELDS[i]![1]));
    return true;
  } catch {
    return false;
  }
}

export function cronMatches(expr: string, date: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`invalid cron: "${expr}"`);
  const sets = fields.map((f, i) =>
    parseField(f, FIELDS[i]![0], FIELDS[i]![1]),
  );

  const dow = date.getUTCDay(); // 0..6, Sunday = 0
  return (
    sets[0]!.has(date.getUTCMinutes()) &&
    sets[1]!.has(date.getUTCHours()) &&
    sets[2]!.has(date.getUTCDate()) &&
    sets[3]!.has(date.getUTCMonth() + 1) &&
    (sets[4]!.has(dow) || (dow === 0 && sets[4]!.has(7)))
  );
}

// Which of the given workflows are due to run at `date` (to the minute).
export function dueCronWorkflows<
  T extends { cron: string | null; enabled: boolean },
>(workflows: T[], date: Date): T[] {
  return workflows.filter(
    (w) =>
      w.enabled && w.cron && isValidCron(w.cron) && cronMatches(w.cron, date),
  );
}
