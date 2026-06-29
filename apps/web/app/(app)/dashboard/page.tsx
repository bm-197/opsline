import Link from "next/link";

import { RunsChart } from "@/components/runs-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { requireContext } from "@/lib/context";
import { formatStamp } from "@/lib/format";
import { getDashboard } from "@/lib/queries";

export default async function DashboardPage() {
  const { orgId } = await requireContext();
  const {
    counts,
    successRate,
    approvalsWaiting,
    series,
    recentFailures,
    workflows,
  } = await getDashboard(orgId);

  const finished = counts.succeeded + counts.failed;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">
          The shape of your work at a glance: what ran, what passed, and what
          needs you.
        </p>
      </div>

      {counts.total === 0 ? (
        <EmptyState
          line="Nothing has run yet. Once workflows fire, this fills with their pulse."
          action={
            <Link
              href="/workflows"
              className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              Go to workflows
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total runs" value={counts.total} sub="all time" />
            <Stat
              label="Success rate"
              value={
                successRate === null ? "—" : `${Math.round(successRate * 100)}%`
              }
              sub={
                finished > 0
                  ? `${counts.succeeded} of ${finished} finished`
                  : "no finished runs"
              }
            />
            <Stat
              label="Running now"
              value={counts.running + counts.pending}
              sub={counts.running + counts.pending > 0 ? "in flight" : "idle"}
            />
            <Stat
              label="Waiting on you"
              value={approvalsWaiting}
              sub={approvalsWaiting > 0 ? "approvals pending" : "all clear"}
              href="/approvals"
              highlight={approvalsWaiting > 0}
            />
          </div>

          <section className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-5">
            <h2 className="font-geist text-xs text-faint">
              Runs, last 14 days
            </h2>
            <RunsChart series={series} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
              <h2 className="font-geist text-xs text-faint">Recent failures</h2>
              {recentFailures.length === 0 ? (
                <p className="text-sm text-muted">
                  Nothing has failed. A quiet failure log is the best kind.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {recentFailures.map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/runs/${run.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-ink"
                      >
                        <span className="truncate font-medium">
                          {run.workflowName}
                        </span>
                        <span className="shrink-0 font-geist text-xs text-faint">
                          {formatStamp(run.finishedAt ?? run.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
              <h2 className="font-geist text-xs text-faint">Workflow health</h2>
              {workflows.length === 0 ? (
                <p className="text-sm text-muted">No workflows yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {workflows.map((wf) => {
                    const rate = wf.total > 0 ? wf.succeeded / wf.total : null;
                    return (
                      <li key={wf.slug} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            href={`/runs?workflow=${wf.slug}`}
                            className="truncate text-sm font-medium underline-offset-4 hover:underline"
                          >
                            {wf.name}
                          </Link>
                          <span className="shrink-0 font-geist text-xs text-faint">
                            {wf.total === 0
                              ? "no runs"
                              : `${Math.round((rate ?? 0) * 100)}% of ${wf.total}`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-sage-deep"
                            style={{ width: `${(rate ?? 0) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  highlight = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  highlight?: boolean;
}) {
  const card = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-3xl border p-5 transition-colors",
        highlight ? "border-butter bg-butter/30" : "border-line bg-card",
        href && "hover:border-faint/50",
      )}
    >
      <span className="font-geist text-xs text-faint">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
