export function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-geist text-xs text-faint">{label}</span>
      <pre className="overflow-x-auto rounded-xl border border-line bg-canvas px-3 py-2 font-geist text-xs text-muted">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
