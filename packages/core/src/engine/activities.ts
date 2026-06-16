import type { Step } from "../ir.ts";
import { HttpStatusError } from "./retry.ts";

export type MailMessage = {
  to: string;
  subject: string;
  body: string;
  from?: string;
  idempotencyKey: string;
};

// v0.1 ships a console transport; a Resend adapter is stubbed but optional.
export interface Mailer {
  send(message: MailMessage): Promise<{ id: string }>;
}

export const consoleMailer: Mailer = {
  async send(message) {
    console.log(
      `[mailer] to=${message.to} subject=${JSON.stringify(message.subject)} idem=${message.idempotencyKey}`,
    );
    return { id: `console_${message.idempotencyKey}` };
  },
};

// Resend transport over its REST API, so no SDK dependency is needed. The
// idempotency key rides along as Resend's Idempotency-Key header, and the
// plain body is sent as text (Resend requires html or text).
export function createResendMailer(config: {
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): Mailer {
  const fetchImpl = config.fetchImpl ?? fetch;
  return {
    async send(message) {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: message.from ?? config.from,
          to: message.to,
          subject: message.subject,
          text: message.body,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`resend send failed (${res.status}): ${detail}`);
      }
      const data = (await res.json()) as { id: string };
      return { id: data.id };
    },
  };
}

export type ActivityDeps = {
  fetchImpl: typeof fetch;
  mailer: Mailer;
};

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Runs one externally-visible step. Throws on failure; the caller decides
// whether the error is retryable. The idempotency key is derived from
// run + step + attempt and travels with every side effect.
export async function runActivity(
  step: Step,
  idempotencyKey: string,
  deps: ActivityDeps,
): Promise<unknown> {
  switch (step.type) {
    case "http_request": {
      const res = await deps.fetchImpl(step.url, {
        method: step.method,
        headers: {
          "Idempotency-Key": idempotencyKey,
          ...(step.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...step.headers,
        },
        body: step.body !== undefined ? JSON.stringify(step.body) : undefined,
        signal: AbortSignal.timeout(step.timeoutMs),
      });
      const body = await readBody(res);
      if (!res.ok) throw new HttpStatusError(res.status, body);
      return { status: res.status, body };
    }

    case "send_email": {
      const result = await deps.mailer.send({
        to: step.to,
        subject: step.subject,
        body: step.body,
        from: step.from,
        idempotencyKey,
      });
      return { sent: true, id: result.id };
    }

    case "slack_webhook": {
      const res = await deps.fetchImpl(step.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ text: step.text }),
      });
      if (!res.ok) throw new HttpStatusError(res.status, await readBody(res));
      return { posted: true };
    }

    default:
      throw new Error(`step type ${step.type} is not an external activity`);
  }
}
