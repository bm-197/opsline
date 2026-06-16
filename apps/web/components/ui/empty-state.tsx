import { cn } from "@/lib/cn";

export function EmptyState({
  line,
  action,
  className,
}: {
  line: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-line bg-card px-8 py-16 text-center",
        className,
      )}
    >
      <p className="font-serif text-lg italic text-muted">{line}</p>
      {action}
    </div>
  );
}
