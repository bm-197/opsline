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
        <Bar className="h-7 w-28" />
        <Bar className="h-4 w-80" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0"
          >
            <Bar className="h-4 w-44" />
            <Bar className="h-5 w-20 rounded-full" />
            <Bar className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
