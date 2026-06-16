import { describe, expect, it } from "vitest";

import { signWebhook, verifyWebhook } from "./webhooks.ts";

const secret = "whsec_test";
const body = JSON.stringify({ amount: 4200 });
const now = 1_700_000_000;

describe("verifyWebhook", () => {
  it("accepts a correctly signed, fresh request", () => {
    const signature = signWebhook(secret, now, body);
    expect(
      verifyWebhook({
        secret,
        signature,
        timestamp: String(now),
        rawBody: body,
        nowSec: now,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a missing signature or timestamp", () => {
    expect(
      verifyWebhook({
        secret,
        signature: null,
        timestamp: String(now),
        rawBody: body,
        nowSec: now,
      }),
    ).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a stale timestamp (replay window)", () => {
    const signature = signWebhook(secret, now - 1000, body);
    expect(
      verifyWebhook({
        secret,
        signature,
        timestamp: String(now - 1000),
        rawBody: body,
        nowSec: now,
      }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered body", () => {
    const signature = signWebhook(secret, now, body);
    expect(
      verifyWebhook({
        secret,
        signature,
        timestamp: String(now),
        rawBody: body + "tampered",
        nowSec: now,
      }),
    ).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects the wrong secret", () => {
    const signature = signWebhook("other", now, body);
    expect(
      verifyWebhook({
        secret,
        signature,
        timestamp: String(now),
        rawBody: body,
        nowSec: now,
      }),
    ).toEqual({ ok: false, reason: "bad_signature" });
  });
});
