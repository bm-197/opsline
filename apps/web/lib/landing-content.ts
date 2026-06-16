// All landing copy in one place so it stays swappable and honest.

export const hero = {
  eyebrow: "Workflow automation for ops teams",
  // The last array entry is rendered as a serif italic accent word.
  headline: ["You stop doing the work", "and start"],
  accent: "watching",
  tail: "it happen.",
  intro:
    "Opsline replaces brittle spreadsheet handoffs with auditable, retryable pipelines. Define a workflow, trigger it manually, on a schedule, or by webhook, and it tells you when it needs you.",
  primary: { label: "Get started", href: "/login" },
  secondary: { label: "Sign in", href: "/login" },
};

export const pillars = [
  {
    title: "Durable runs",
    body: "Every step runs with retries, backoff, and timeouts. When one fails, retry just that step, not the whole pipeline.",
    tint: "sage" as const,
  },
  {
    title: "Human in the loop",
    body: "Pause a run for a person. Approve or reject from the inbox, with a comment, and the workflow picks up where it left off.",
    tint: "peri" as const,
  },
  {
    title: "Nothing off the record",
    body: "Every state change and decision is appended to an immutable audit log. Who did what, when, and why.",
    tint: "blush" as const,
  },
];

export const steps = [
  {
    n: "01",
    title: "Define it once",
    body: "Build a workflow in the editor: HTTP calls, delays, approvals, emails, Slack. No code, no spreadsheet.",
  },
  {
    n: "02",
    title: "Trigger it your way",
    body: "Run it by hand, on a cron schedule, or from a signed inbound webhook. Same pipeline, three doors.",
  },
  {
    n: "03",
    title: "Watch it happen",
    body: "Follow every run live: the step timeline, attempt history, payloads, and the moment it needs a human.",
  },
];

export const stepTypes = [
  "HTTP request",
  "Delay",
  "Branch",
  "Human approval",
  "Send email",
  "Slack webhook",
];

export const footer = {
  // The accent clause renders as a serif italic.
  tagline: {
    plain: "Stop watching spreadsheets.",
    accent: "Start watching the work.",
  },
  cta: { label: "Get started", href: "/login" },
  columns: [
    {
      heading: "Product",
      links: [
        { label: "Why teams trust it", href: "/#why" },
        { label: "How it works", href: "/#how" },
        { label: "Step types", href: "/#how" },
      ],
    },
    {
      heading: "Platform",
      links: [
        { label: "Runs", href: "/runs" },
        { label: "Approvals", href: "/approvals" },
        { label: "Audit log", href: "/audit" },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "Sign in", href: "/login" },
        { label: "Create a workspace", href: "/login" },
      ],
    },
  ],
  name: "Opsline",
  blurb:
    "Workflow automation for ops teams: auditable, retryable pipelines with human approvals.",
  email: "ops@opsline.example",
  // Add real handles to render the social row; empty omits it.
  social: [] as {
    label: string;
    href: string;
    icon: "github" | "x" | "linkedin";
  }[],
  wordmark: "Opsline",
};

export const closing = {
  eyebrow: "Ready when you are",
  title: "Let the pipeline carry the",
  accent: "busywork.",
  body: "Set up your first workflow in a few minutes. The demo workspace is already seeded so you can click through a real run.",
  cta: { label: "Open Opsline", href: "/login" },
};
