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
        <Bar className="h-7 w-36" />
        <Bar className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
      <Bar className="h-56 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Bar className="h-44 rounded-3xl" />
        <Bar className="h-44 rounded-3xl" />
      </div>
    </div>
  );
}
