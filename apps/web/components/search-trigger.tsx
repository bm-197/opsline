"use client";

import { cn } from "@/lib/cn";

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function open() {
  window.dispatchEvent(new Event("opsline:command"));
}

// The Gmail-style search box. It does not search inline; it opens the command
// palette (the same surface as Cmd+K), so there is one place to search and jump.
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "glass-card flex h-11 items-center gap-3 rounded-2xl px-4 text-left text-sm text-faint transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      <SearchIcon className="size-[1.2rem] shrink-0" />
      <span className="flex-1 truncate">Search or jump to...</span>
      <kbd className="hidden shrink-0 rounded-md border border-line bg-canvas px-1.5 py-0.5 font-geist text-[11px] text-faint sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

// Compact icon-only trigger for the mobile top strip.
export function SearchTriggerIcon() {
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Search"
      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-line/60 hover:text-ink"
    >
      <SearchIcon className="size-5" />
    </button>
  );
}
