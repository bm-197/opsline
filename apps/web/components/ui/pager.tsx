import Link from "next/link";

import { cn } from "@/lib/cn";

// Cursor-free prev/next pager. The page builds hrefs that preserve filters.
export function Pager({
  page,
  hasNext,
  hrefFor,
}: {
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
}) {
  if (page === 0 && !hasNext) return null;

  const base =
    "rounded-lg border border-line bg-card px-3 py-1.5 text-sm transition-colors";
  const enabled = "text-ink hover:bg-canvas";
  const disabled = "pointer-events-none text-faint opacity-60";

  return (
    <div className="flex items-center justify-between">
      <Link
        href={hrefFor(Math.max(0, page - 1))}
        aria-disabled={page === 0}
        className={cn(base, page === 0 ? disabled : enabled)}
      >
        Previous
      </Link>
      <span className="font-geist text-xs text-faint">Page {page + 1}</span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={!hasNext}
        className={cn(base, hasNext ? enabled : disabled)}
      >
        Next
      </Link>
    </div>
  );
}
