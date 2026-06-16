import { TableKeyboardNav } from "@/components/table-keyboard-nav";
import { CopyableId } from "@/components/ui/copyable-id";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireContext } from "@/lib/context";
import { formatStamp } from "@/lib/format";
import { listAudit, PAGE_SIZE } from "@/lib/queries";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await requireContext();
  const page = Math.max(0, Number((await searchParams).page) || 0);
  const events = await listAudit(ctx.orgId, {}, page);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="text-sm text-muted">
          An append-only record of every state change and human action.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState line="No activity recorded yet." />
      ) : (
        <>
          <TableKeyboardNav />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>When</TableHeader>
                <TableHeader>Actor</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Entity</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  data-row
                  tabIndex={0}
                  className="focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <TableCell className="font-geist text-xs text-muted">
                    {formatStamp(event.at)}
                  </TableCell>
                  <TableCell className="font-geist text-xs text-muted">
                    {event.actor}
                  </TableCell>
                  <TableCell className="font-medium">{event.action}</TableCell>
                  <TableCell className="font-geist text-xs text-muted">
                    {event.entityType} <CopyableId id={event.entityId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <Pager
        page={page}
        hasNext={events.length === PAGE_SIZE}
        hrefFor={(p) => (p ? `/audit?page=${p}` : "/audit")}
      />
    </main>
  );
}
