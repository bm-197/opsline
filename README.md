# Opsline

Workflow automation for ops teams: auditable, retryable pipelines with human approvals. You define a workflow, trigger it manually, on a schedule, or via a signed webhook, then watch every run move through its steps with retries, approvals, and a complete audit trail. You stop doing the work and start watching it happen, and it tells you when it needs you.

## Stack

- **pnpm** workspaces monorepo
- **apps/web**: Next.js 16 (App Router, RSC), Tailwind v4, Better Auth (email/password + organizations), Inngest functions served from `/api/inngest`
- **packages/core**: workflow IR + zod validation, state machines, the interpreter and step activities, webhook HMAC + cron helpers
- **packages/db**: Drizzle ORM schema, migrations, seeds (Postgres)
- **Inngest** for durable execution (`step.run`/`step.sleep`/`step.waitForEvent`, cron triggers, `cancelOn`)

## Getting started

Requires Node 22+, pnpm 10, and Docker (OrbStack).

```bash
pnpm install
docker compose up -d        # Postgres 18 on localhost:5432
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate             # apply migrations
pnpm seed                   # seed demo data + the demo login credential
```

Run the app and the Inngest dev server in two terminals:

```bash
pnpm dev                    # http://localhost:3000
pnpm dev:inngest            # http://localhost:8288 (durable execution)
```

Sign in with the demo account: **operator@northwind.example / opsline-demo**.

## The demo

Trigger the "Approval demo" or "Supplier invoice approval" workflow from `/workflows` (or POST a signed request to the workflow's webhook endpoint shown on its page). Watch the run on `/runs/[id]` move through its steps, approve it from `/approvals`, see the email step fire, fail an HTTP step and retry just that step, and find every action on `/audit`.

## Commands

| Command                                                     | Description                               |
| ----------------------------------------------------------- | ----------------------------------------- |
| `pnpm dev`                                                  | Next.js dev server (port 3000)            |
| `pnpm dev:inngest`                                          | Inngest dev server (port 8288)            |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | the gates                                 |
| `pnpm db:generate`                                          | drizzle-kit generate after schema changes |
| `pnpm db:migrate`                                           | apply migrations                          |
| `pnpm seed`                                                 | seed data + demo auth credential          |

## Layout

- `/login`, `/` (landing), `/accept-invite` are public; everything else is gated by `middleware.ts`.
- Authenticated routes live under `app/(app)/` with the sidebar shell; the org/role comes from the session via `lib/context.ts`.
- Roles: **viewer** (read-only), **operator** (run/approve), **admin** (everything). Enforced in server actions and gated in the UI.

Engineering decisions are logged in [DECISIONS.md](./DECISIONS.md).
