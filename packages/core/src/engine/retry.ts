import { NonRetriableError } from "inngest";

import type { RetryConfig } from "../ir.ts";

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  backoff: { strategy: "exponential", delayMs: 1_000 },
};

const MAX_BACKOFF_MS = 86_400_000; // one day

// Delay before the next attempt, given the attempt that just failed (1-based).
export function backoffMs(retry: RetryConfig, failedAttempt: number): number {
  const { strategy, delayMs } = retry.backoff;
  const raw =
    strategy === "fixed" ? delayMs : delayMs * 2 ** (failedAttempt - 1);
  return Math.min(raw, MAX_BACKOFF_MS);
}

// An HTTP/Slack response that came back with a non-2xx status.
export class HttpStatusError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with status ${status}`);
    this.name = "HttpStatusError";
    this.status = status;
    this.body = body;
  }
}

// 4xx (except 429) and explicit NonRetriableErrors are terminal: retrying will
// not help. 5xx and 429 are transient.
export function isRetryable(error: unknown): boolean {
  if (error instanceof NonRetriableError) return false;
  if (error instanceof HttpStatusError) {
    return error.status >= 500 || error.status === 429;
  }
  return true;
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof HttpStatusError) {
    return { name: error.name, message: error.message, status: error.status };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "Error", message: String(error) };
}
