import Image from "next/image";

import { Logo } from "@/components/ui/logo";

// A macOS-style screen: a translucent menu bar and the Opsline app window (a
// real screenshot), clipped at the bottom, with a Sonoma-style notification
// using the Opsline logo. Decorative.
export function Showcase() {
  return (
    <div className="h-[590px] overflow-hidden rounded-[28px] bg-linear-to-b from-[#c6cfec] via-[#dde2f2] to-[#eceff7] shadow-[0_30px_80px_-36px_rgba(25,25,29,0.4)] ring-1 ring-white/40 sm:h-[650px]">
      {/* macOS menu bar */}
      <div className="flex h-7 items-center gap-4 bg-white/35 px-4 text-[13px] text-ink/80 backdrop-blur-md">
        <svg
          viewBox="0 0 384 512"
          fill="currentColor"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M318.7 268c-.3-45.9 20.5-80.6 62.4-105.4-23.4-33.6-58.8-52-105.3-55.5-44.1-3.4-92.3 25.8-109.9 25.8-18.7 0-61.1-24.6-94.5-24.6C61.5 109.1 0 159.5 0 261.9c0 30.3 5.5 61.6 16.6 93.8 14.8 42.4 68.2 146.4 124 144.7 29.2-.7 49.8-20.7 87.8-20.7 36.9 0 56 20.7 88.5 20.7 56.3-.8 104.6-95.3 118.7-137.8-75.5-35.6-71.4-104.3-71.4-106.5zM248.5 67.5c33.9-40.2 30.8-76.8 29.8-90-30 1.7-64.7 20.4-84.4 43.5-21.7 24.7-34.5 55.3-31.8 87.4 32.4 2.5 62-14.1 86.4-40.9z" />
        </svg>
        <span className="font-semibold">Opsline</span>
        <span className="hidden text-ink/55 sm:inline">File</span>
        <span className="hidden text-ink/55 sm:inline">Edit</span>
        <span className="hidden text-ink/55 sm:inline">View</span>
        <div className="ml-auto flex items-center gap-3 text-ink/70">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.3h.01" />
          </svg>
          <svg
            viewBox="0 0 28 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-3.5 w-6"
            aria-hidden="true"
          >
            <rect x="1" y="7" width="20" height="10" rx="3" />
            <rect
              x="3"
              y="9"
              width="14"
              height="6"
              rx="1.5"
              fill="currentColor"
              stroke="none"
            />
            <path d="M23.5 11v2" strokeLinecap="round" />
          </svg>
          <span className="font-geist text-[12px]">9:14 AM</span>
        </div>
      </div>

      {/* desktop with the app window */}
      <div className="relative px-4 pt-7 sm:px-7 sm:pt-9">
        <div className="mx-auto w-[88%] overflow-hidden rounded-2xl bg-card shadow-[0_22px_50px_-26px_rgba(25,25,29,0.4)] ring-1 ring-line">
          {/* window title bar */}
          <div className="relative flex items-center border-b border-line bg-[#fafafb] px-3 py-1.5">
            <div className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="absolute left-1/2 hidden w-full max-w-[16rem] -translate-x-1/2 items-center gap-1.5 rounded-md bg-line/50 px-2.5 py-1 sm:flex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-3 text-faint"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="font-geist text-[11px] text-faint">
                Search runs, workflows, approvals
              </span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="rounded-md bg-peri px-2 py-0.5 text-[11px] font-medium text-ink">
                Open
              </span>
              <span className="size-5 rounded-full bg-linear-to-b from-peri-deep to-[#8ea0c8]" />
            </div>
          </div>

          {/* the real app, as a screenshot */}
          <Image
            src="/demo-app.png"
            alt="Opsline runs"
            width={3020}
            height={1772}
            priority
            unoptimized
            className="w-full"
          />
        </div>

        {/* macOS notification, tucked into the top-right corner under the bar */}
        <div className="glass-card absolute top-2 right-2 w-[230px] rounded-[15px] p-2.5 sm:right-3">
          <div className="flex gap-2.5">
            <Logo className="size-8 rounded-[8px]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium">Opsline</span>
                <span className="font-geist text-[10px] text-faint">now</span>
              </div>
              <p className="text-[12px] leading-snug font-semibold">
                2 approvals waiting
              </p>
              <p className="text-[12px] leading-snug text-muted">
                Supplier invoice approval paused for your ok.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
