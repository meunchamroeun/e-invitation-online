export default function AdminLoading() {
  return (
    <div role="status" className="motion-safe:animate-pulse">
      <span className="sr-only">Loading administration data</span>
      <div className="h-9 w-44 rounded-lg bg-line" />
      <div className="mt-3 h-4 w-2/3 max-w-80 rounded bg-line" />
      <div className="mt-7 h-64 rounded-xl border border-line bg-white" />
    </div>
  );
}
