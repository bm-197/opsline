"use client";

import { useEffect } from "react";

// Arrow-key navigation across table rows marked with `data-row` (focusable
// links). Up/Down move focus; Enter activates the link natively. Ignores
// keystrokes while typing in an input.
export function TableKeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const rows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-row]"),
      );
      if (rows.length === 0) return;
      e.preventDefault();

      const current = document.activeElement as HTMLElement | null;
      const index = current ? rows.indexOf(current) : -1;
      const next =
        e.key === "ArrowDown"
          ? Math.min(rows.length - 1, index + 1)
          : Math.max(0, index - 1);
      rows[next === -1 ? 0 : next]?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
