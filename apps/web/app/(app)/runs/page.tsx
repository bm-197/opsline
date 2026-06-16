import Link from "next/link";

import { TableKeyboardNav } from "@/components/table-keyboard-nav";
import { CopyableId } from "@/components/ui/copyable-id";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import { StatusChip, type RunStatus } from "@/components/ui/chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { requireContext } from "@/lib/context";
import { formatDuration, formatStamp } from "@/lib/format";
import { listRuns, listWorkflows, PAGE_SIZE } from "@/lib/queries";

const STATES = [
  "pending",
  "running",
  "waiting",
  "succeeded",
  "failed",
  "canceled",
] as const;

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; workflow?: string; page?: string }>;
}) {
  const { state, workflow, page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const { orgId } = await requireContext();
  const [runs, workflows] = await Promise.all([
    listRuns(orgId, { state, workflowSlug: workflow }, page),
    listWorkflows(orgId),
  ]);

  const hrefWith = (next: {
    state?: string;
    workflow?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const s = "state" in next ? next.state : state;
    const w = "workflow" in next ? next.workflow : workflow;
    if (s) params.set("state", s);
    if (w) params.set("workflow", w);
    if (next.page) params.set("page", String(next.page));
    const qs = params.toString();
    return qs ? `/runs?${qs}` : "/runs";
  };
  const filterHref = (next: { state?: string; workflow?: string }) =>
    hrefWith(next);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="text-sm text-muted">
          Every run, with its steps, attempts, and outcome.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <FilterRow label="Status">
          <FilterLink href={filterHref({ state: undefined })} active={!state}>
            All
          </FilterLink>
          {STATES.map((s) => (
            <FilterLink
              key={s}
              href={filterHref({ state: s })}
              active={state === s}
            >
              {s}
            </FilterLink>
          ))}
        </FilterRow>
        {workflows.length > 0 && (
          <FilterRow label="Workflow">
            <FilterLink
              href={filterHref({ workflow: undefined })}
              active={!workflow}
            >
              All
            </FilterLink>
            {workflows.map((w) => (
              <FilterLink
                key={w.slug}
                href={filterHref({ workflow: w.slug })}
                active={workflow === w.slug}
              >
                {w.name}
              </FilterLink>
            ))}
          </FilterRow>
        )}
      </div>

      {runs.length === 0 ? (
        <EmptyState
          line="Nothing has run yet. Workflows you trigger will line up here."
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
          <TableKeyboardNav />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Workflow</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Trigger</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Started</TableHeader>
                <TableHeader>Run id</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/runs/${run.id}`}
                      data-row
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
                    >
                      {run.workflowName}
                    </Link>
                    <span className="ml-2 font-geist text-xs text-faint">
                      v{run.version}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={run.state as RunStatus} />
                  </TableCell>
                  <TableCell className="text-muted">{run.trigger}</TableCell>
                  <TableCell className="font-geist text-xs text-muted">
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </TableCell>
                  <TableCell className="font-geist text-xs text-muted">
                    {formatStamp(run.startedAt ?? run.createdAt)}
                  </TableCell>
                  <TableCell>
                    <CopyableId id={run.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager
            page={page}
            hasNext={runs.length === PAGE_SIZE}
            hrefFor={(p) => hrefWith({ page: p })}
          />
        </>
      )}
    </main>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 font-geist text-xs text-faint">{label}</span>
      {children}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-xs capitalize ring-1 ring-inset transition-colors",
        active
          ? "bg-ink text-white ring-ink"
          : "bg-card text-muted ring-line hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
