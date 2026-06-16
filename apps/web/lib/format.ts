export function formatDuration(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  if (!start) return "—";
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  const secondsTotal = Math.max(0, Math.round((to - from) / 1000));
  if (secondsTotal < 60) return `${secondsTotal}s`;
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = secondsTotal % 60;
  if (minutes < 60)
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}

const stamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatStamp(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return stamp.format(new Date(value));
}
