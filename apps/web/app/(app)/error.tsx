"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line bg-card px-8 py-16 text-center">
      <p className="font-serif text-lg italic text-muted">
        Something went sideways loading this page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
