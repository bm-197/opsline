import { NonRetriableError } from "inngest";
import { describe, expect, it } from "vitest";

import {
  backoffMs,
  DEFAULT_RETRY,
  HttpStatusError,
  isRetryable,
  serializeError,
} from "./retry.ts";

describe("backoffMs", () => {
  it("grows exponentially", () => {
    expect(backoffMs(DEFAULT_RETRY, 1)).toBe(1_000);
    expect(backoffMs(DEFAULT_RETRY, 2)).toBe(2_000);
    expect(backoffMs(DEFAULT_RETRY, 3)).toBe(4_000);
  });

  it("stays flat when fixed", () => {
    const retry = {
      maxAttempts: 5,
      backoff: { strategy: "fixed" as const, delayMs: 500 },
    };
    expect(backoffMs(retry, 1)).toBe(500);
    expect(backoffMs(retry, 4)).toBe(500);
  });

  it("caps at one day", () => {
    const retry = {
      maxAttempts: 40,
      backoff: { strategy: "exponential" as const, delayMs: 1_000 },
    };
    expect(backoffMs(retry, 30)).toBe(86_400_000);
  });
});

describe("isRetryable", () => {
  it("treats 5xx and 429 as retryable, other 4xx as terminal", () => {
    expect(isRetryable(new HttpStatusError(503, null))).toBe(true);
    expect(isRetryable(new HttpStatusError(429, null))).toBe(true);
    expect(isRetryable(new HttpStatusError(400, null))).toBe(false);
    expect(isRetryable(new HttpStatusError(404, null))).toBe(false);
  });

  it("never retries NonRetriableError", () => {
    expect(isRetryable(new NonRetriableError("bad input"))).toBe(false);
  });

  it("retries unknown errors", () => {
    expect(isRetryable(new Error("network blip"))).toBe(true);
  });
});

describe("serializeError", () => {
  it("includes the status for HttpStatusError", () => {
    expect(serializeError(new HttpStatusError(500, null))).toMatchObject({
      name: "HttpStatusError",
      status: 500,
    });
  });
});
