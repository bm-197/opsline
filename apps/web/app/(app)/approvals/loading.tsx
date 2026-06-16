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
        <Bar className="h-7 w-32" />
        <Bar className="h-4 w-96" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-16" />
            </div>
            <Bar className="h-4 w-3/4" />
            <Bar className="h-4 w-48" />
            <div className="flex gap-2 pt-1">
              <Bar className="h-9 w-24 rounded-xl" />
              <Bar className="h-9 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
