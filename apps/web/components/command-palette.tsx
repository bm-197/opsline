"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchIcon } from "@/components/search-trigger";

const nav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Runs", href: "/runs" },
  { label: "Approvals", href: "/approvals" },
  { label: "Workflows", href: "/workflows" },
  { label: "Audit", href: "/audit" },
  { label: "Settings", href: "/settings" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Match the physical K key (e.code) so Caps Lock, Shift, and non-US
      // layouts still trigger it, not just a lowercase "k".
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.code === "KeyK" || e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    // The header search box opens the palette by dispatching this event.
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("opsline:command", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("opsline:command", onOpen);
    };
  }, []);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemClass =
    "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted data-[selected=true]:bg-line/70 data-[selected=true]:text-ink";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-xl"
      >
        <Command label="Command palette" className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <SearchIcon className="size-[1.2rem] shrink-0 text-faint" />
            <Command.Input
              autoFocus
              placeholder="Search or jump to..."
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-faint"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
              No results.
            </Command.Empty>
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-geist [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-faint"
            >
              {nav.map((n) => (
                <Command.Item
                  key={n.href}
                  value={n.label}
                  onSelect={() => go(n.href)}
                  className={itemClass}
                >
                  {n.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
