import { Fragment } from "react";

// Splits text into words that rise out of an overflow-hidden slot, staggered.
// A server component; the animation lives in globals.css (.rise-word) and is
// inert under prefers-reduced-motion.
export function RiseWords({
  text,
  start = 0,
  className,
}: {
  text: string;
  start?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className={`rise-word ${className ?? ""}`}>
            <span style={{ animationDelay: `${start + i * 70}ms` }}>
              {word}
            </span>
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}
