import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-opsline-signature";
export const TIMESTAMP_HEADER = "x-opsline-timestamp";

// HMAC-SHA256 over `${timestamp}.${rawBody}`, hex-encoded. The timestamp is in
// the signed payload so a captured signature cannot be replayed with a new one.
export function signWebhook(
  secret: string,
  timestamp: string | number,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "expired" | "bad_signature" };

export function verifyWebhook(input: {
  secret: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  nowSec: number;
  toleranceSec?: number;
}): WebhookVerifyResult {
  const { secret, signature, timestamp, rawBody, nowSec } = input;
  const tolerance = input.toleranceSec ?? 300;

  if (!signature || !timestamp) return { ok: false, reason: "missing" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > tolerance) {
    return { ok: false, reason: "expired" };
  }

  const expected = signWebhook(secret, timestamp, rawBody);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
