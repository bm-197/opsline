type Day = { date: Date; total: number; succeeded: number; failed: number };

const label = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function Swatch({ color, children }: { color: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-geist text-[11px] text-muted">
      <span className={`size-2.5 rounded-full ${color}`} />
      {children}
    </span>
  );
}

// A 14-day stacked bar chart of run outcomes. No charting dependency: bars are
// flex segments sized by run count, tinted with the status pastels.
export function RunsChart({ series }: { series: Day[] }) {
  const max = Math.max(1, ...series.map((d) => d.total));
  const totalRuns = series.reduce((sum, d) => sum + d.total, 0);
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-40 items-end gap-1.5">
        {series.map((d, i) => {
          const other = d.total - d.succeeded - d.failed;
          return (
            <div
              key={i}
              title={`${label.format(d.date)}: ${d.total} run${d.total === 1 ? "" : "s"}`}
              className="flex h-full flex-1 flex-col justify-end"
            >
              {d.total === 0 ? (
                <div className="h-1 w-full rounded-full bg-line" />
              ) : (
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-md"
                  style={{ height: `${Math.max(6, (d.total / max) * 100)}%` }}
                >
                  {d.succeeded > 0 && (
                    <div
                      className="bg-sage-deep"
                      style={{ flexGrow: d.succeeded }}
                    />
                  )}
                  {d.failed > 0 && (
                    <div
                      className="bg-blush-deep"
                      style={{ flexGrow: d.failed }}
                    />
                  )}
                  {other > 0 && (
                    <div className="bg-peri-deep" style={{ flexGrow: other }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-geist text-[11px] text-faint">
          {first ? label.format(first.date) : ""}
        </span>
        <span className="font-geist text-[11px] text-faint">
          {totalRuns} run{totalRuns === 1 ? "" : "s"} in 14 days
        </span>
        <span className="font-geist text-[11px] text-faint">
          {last ? label.format(last.date) : ""}
        </span>
      </div>

      <div className="flex gap-4">
        <Swatch color="bg-sage-deep">Succeeded</Swatch>
        <Swatch color="bg-blush-deep">Failed</Swatch>
        <Swatch color="bg-peri-deep">Other</Swatch>
      </div>
    </div>
  );
}
