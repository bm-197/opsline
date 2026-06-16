import { describe, expect, it } from "vitest";

import { cronMatches, dueCronWorkflows, isValidCron } from "./cron.ts";

// 2026-06-15 08:00 UTC is a Monday.
const monday0800 = new Date("2026-06-15T08:00:00Z");

describe("isValidCron", () => {
  it("accepts well-formed expressions", () => {
    expect(isValidCron("0 8 * * *")).toBe(true);
    expect(isValidCron("*/15 * * * *")).toBe(true);
    expect(isValidCron("0 9 1-5 * 1-5")).toBe(true);
  });

  it("rejects malformed expressions", () => {
    expect(isValidCron("0 8 * *")).toBe(false);
    expect(isValidCron("99 8 * * *")).toBe(false);
    expect(isValidCron("nonsense")).toBe(false);
  });
});

describe("cronMatches", () => {
  it("matches a daily time", () => {
    expect(cronMatches("0 8 * * *", monday0800)).toBe(true);
    expect(cronMatches("0 9 * * *", monday0800)).toBe(false);
  });

  it("matches step and range fields", () => {
    expect(cronMatches("*/15 * * * *", monday0800)).toBe(true); // minute 0
    expect(cronMatches("0 8 * * 1", monday0800)).toBe(true); // Monday
    expect(cronMatches("0 8 * * 0", monday0800)).toBe(false); // Sunday
  });

  it("treats 7 as Sunday", () => {
    const sunday = new Date("2026-06-14T08:00:00Z");
    expect(cronMatches("0 8 * * 7", sunday)).toBe(true);
  });
});

describe("dueCronWorkflows", () => {
  it("returns only enabled workflows whose cron matches now", () => {
    const workflows = [
      { id: "a", cron: "0 8 * * *", enabled: true },
      { id: "b", cron: "0 9 * * *", enabled: true },
      { id: "c", cron: "0 8 * * *", enabled: false },
      { id: "d", cron: null, enabled: true },
    ];
    const due = dueCronWorkflows(workflows, monday0800).map((w) => w.id);
    expect(due).toEqual(["a"]);
  });
});
