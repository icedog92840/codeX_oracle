// DripPage reserves the route required for the Phase 5 compounding visualizer.
export default function DripPage() {
  const bars = [34, 42, 48, 57, 69, 83, 92];

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-normal">DRIP Visualizer</h1>
      <section className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex h-64 items-end gap-2 border-b border-l px-3 pb-3">
          {bars.map((height, index) => (
            <div key={height} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-xl bg-emerald-600" style={{ height: `${height}%` }} />
              <div className="w-full rounded-t-xl bg-slate-300" style={{ height: `${Math.max(height - 18, 12)}%` }} />
              <span className="font-mono text-xs text-muted-foreground">{index + 1}Y</span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-2 rounded-full bg-secondary">
          <div className="h-2 w-2/3 rounded-full bg-primary" />
        </div>
      </section>
    </div>
  );
}
