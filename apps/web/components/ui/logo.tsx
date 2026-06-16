"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

const DEFAULT_LOGO = "/logo.png";

// The Opsline mark. Pass an org logo URL via `src`; a broken or missing URL
// falls back to the default Opsline logo. Defaults to a 28px circle.
export function Logo({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? src : DEFAULT_LOGO;
  // A fixed square box with `fill` + object-cover, so a non-square org logo is
  // cropped to the circle instead of squished horizontally.
  return (
    <span
      className={cn(
        "relative inline-block size-7 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      <Image
        src={url}
        alt="Opsline"
        fill
        sizes="64px"
        priority
        unoptimized={url !== DEFAULT_LOGO}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </span>
  );
}
