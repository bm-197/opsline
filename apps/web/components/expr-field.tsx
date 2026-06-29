"use client";

import { type Ref, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { ExprGroup } from "@/lib/workflow-draft";

const inputCls =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2 pr-10 text-sm outline-none focus-visible:border-faint";

// A text field that accepts {{ }} expressions, with a picker that inserts a
// reference (trigger payload or an earlier step's output) at the cursor.
export function ExprField({
  value,
  onChange,
  groups,
  multiline = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: ExprGroup[];
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  const insert = (inner: string, caretInside: boolean) => {
    const el = ref.current;
    const snippet = `{{ ${inner} }}`;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    setOpen(false);
    const caret = caretInside
      ? start + 3 + inner.length
      : start + snippet.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={ref as Ref<HTMLTextAreaElement>}
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputCls, "resize-none")}
        />
      ) : (
        <input
          ref={ref as Ref<HTMLInputElement>}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}

      <button
        type="button"
        aria-label="Insert a variable"
        title="Insert a variable"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "absolute right-1.5 grid size-7 place-items-center rounded-lg font-geist text-xs text-faint transition-colors hover:bg-line/60 hover:text-ink",
          multiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
        )}
      >
        {"{ }"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-40 mt-1 max-h-72 w-64 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-xl">
            {groups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <p className="px-2.5 pt-1 pb-1 font-geist text-[11px] tracking-wide text-faint uppercase">
                  {group.label}
                </p>
                {group.refs.map((r) => (
                  <button
                    key={r.label + r.insert}
                    type="button"
                    onClick={() => insert(r.insert, r.caretInside ?? false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-line/60"
                  >
                    <span className="font-geist text-faint">{"{ }"}</span>
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
