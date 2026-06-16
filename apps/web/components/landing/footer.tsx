import type { ReactNode } from "react";
import Link from "next/link";

import { footer } from "@/lib/landing-content";

type SocialName = "github" | "x" | "linkedin";

const SOCIAL_PATHS: Record<SocialName, ReactNode> = {
  github: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 0.257812C4.5 0.257812 0 4.75781 0 10.2578C0 14.6328 2.875 18.3828 6.875 19.7578C7.375 19.8828 7.5 19.5078 7.5 19.2578C7.5 19.0078 7.5 18.3828 7.5 17.5078C4.75 18.1328 4.125 16.2578 4.125 16.2578C3.625 15.1328 3 14.7578 3 14.7578C2.125 14.1328 3.125 14.1328 3.125 14.1328C4.125 14.2578 4.625 15.1328 4.625 15.1328C5.5 16.7578 7 16.2578 7.5 16.0078C7.625 15.3828 7.875 14.8828 8.125 14.6328C5.875 14.3828 3.625 13.5078 3.625 9.63281C3.625 8.50781 4 7.63281 4.625 7.00781C4.5 6.75781 4.125 5.75781 4.75 4.38281C4.75 4.38281 5.625 4.13281 7.5 5.38281C8.25 5.13281 9.125 5.00781 10 5.00781C10.875 5.00781 11.75 5.13281 12.5 5.38281C14.375 4.13281 15.25 4.38281 15.25 4.38281C15.75 5.75781 15.5 6.75781 15.375 7.00781C16 7.75781 16.375 8.63281 16.375 9.63281C16.375 13.5078 14 14.2578 11.75 14.5078C12.125 15.0078 12.5 15.6328 12.5 16.5078C12.5 17.8828 12.5 18.8828 12.5 19.2578C12.5 19.5078 12.625 19.8828 13.25 19.7578C17.25 18.3828 20.125 14.6328 20.125 10.2578C20 4.75781 15.5 0.257812 10 0.257812Z"
    />
  ),
  x: (
    <path d="M14.6009 2H17.0544L11.6943 8.35385L18 17H13.0627L9.19566 11.7562L4.77087 17H2.31595L8.04904 10.2038L2 2H7.06262L10.5581 6.79308L14.6009 2ZM13.7399 15.4769H15.0993L6.32392 3.44308H4.86506L13.7399 15.4769Z" />
  ),
  linkedin: (
    <path
      transform="scale(0.833333)"
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"
    />
  ),
};

function SocialIcon({ name }: { name: SocialName }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
      {SOCIAL_PATHS[name]}
    </svg>
  );
}

// Product footer: a closing line with a CTA, nav columns, a brand block, the
// legal row, and a large quiet wordmark. Server component, so the year is live.
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden border-t border-line bg-card">
      <div className="mx-auto max-w-5xl px-6 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h3 className="gradient-ink max-w-md pb-1 text-2xl font-medium leading-snug tracking-[-0.02em] sm:text-3xl">
            {footer.tagline.plain}{" "}
            <em className="font-serif italic">{footer.tagline.accent}</em>
          </h3>
          <Link
            href={footer.cta.href}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-card transition-opacity hover:opacity-90"
          >
            {footer.cta.label}
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 text-sm text-muted sm:col-span-1">
            <p className="font-medium text-foreground">{footer.name}</p>
            <p className="mt-2 max-w-xs leading-relaxed">{footer.blurb}</p>
            <a
              href={`mailto:${footer.email}`}
              className="mt-4 inline-block font-geist text-xs underline decoration-line underline-offset-4 transition-colors hover:text-foreground"
            >
              {footer.email}
            </a>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.heading} className="text-sm">
              <p className="font-geist text-[11px] font-medium tracking-[0.16em] text-faint uppercase">
                {column.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line py-5 font-geist text-xs text-faint">
          <span>
            © {year} {footer.name}. All rights reserved.
          </span>
          {footer.social.length > 0 && (
            <ul className="flex items-center gap-5">
              {footer.social.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="text-faint transition-colors hover:text-foreground"
                  >
                    <SocialIcon name={item.icon} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p
          aria-hidden
          className="gradient-ink -mb-6 -mt-2 select-none text-center font-geist text-[clamp(4rem,17vw,11rem)] leading-none font-semibold tracking-[-0.04em] opacity-[0.06]"
        >
          {footer.wordmark}
        </p>
      </div>
    </footer>
  );
}
