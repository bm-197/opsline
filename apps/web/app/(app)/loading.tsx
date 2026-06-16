export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-line motion-reduce:animate-none" />
      <div className="h-4 w-72 animate-pulse rounded-lg bg-line motion-reduce:animate-none" />
      <div className="mt-4 h-48 animate-pulse rounded-3xl bg-line motion-reduce:animate-none" />
    </div>
  );
}
