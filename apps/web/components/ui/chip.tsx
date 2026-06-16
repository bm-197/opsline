import { cn } from "@/lib/cn";

export type RunStatus =
  | "pending"
  | "succeeded"
  | "running"
  | "waiting"
  | "failed"
  | "canceled"
  | "skipped";

const statusStyles: Record<RunStatus, string> = {
  pending: "bg-line/60 text-muted ring-line",
  succeeded: "bg-sage text-ink ring-sage-deep/50",
  running: "bg-peri text-ink ring-peri-deep/60",
  waiting: "bg-butter/40 text-ink ring-butter",
  failed: "bg-blush text-ink ring-blush-deep/70",
  canceled: "bg-line/60 text-muted ring-line",
  skipped: "bg-line/60 text-muted ring-line",
};

const statusLabels: Record<RunStatus, string> = {
  pending: "Pending",
  succeeded: "Succeeded",
  running: "Running",
  waiting: "Waiting",
  failed: "Failed",
  canceled: "Canceled",
  skipped: "Skipped",
};

export function StatusChip({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-line/60 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}
