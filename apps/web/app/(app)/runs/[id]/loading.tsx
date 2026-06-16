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
        <Bar className="h-7 w-56" />
        <Bar className="h-4 w-40" />
      </div>
      <div className="flex gap-2">
        <Bar className="h-9 w-28 rounded-xl" />
        <Bar className="h-9 w-36 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-3xl border border-line bg-card p-5"
          >
            <Bar className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bar className="h-4 w-48" />
              <Bar className="h-3 w-32" />
            </div>
            <Bar className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
