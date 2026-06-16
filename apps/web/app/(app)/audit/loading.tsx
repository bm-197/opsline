import { cn } from "@/lib/cn";

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-line motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Bar className="h-7 w-24" />
        <Bar className="h-4 w-96" />
      </div>
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0"
          >
            <Bar className="h-4 w-28" />
            <Bar className="h-4 w-24" />
            <Bar className="h-4 w-32" />
            <Bar className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
