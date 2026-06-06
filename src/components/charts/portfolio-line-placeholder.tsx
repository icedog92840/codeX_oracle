import type { ChartPoint } from "@/lib/types/dashboard";

// PortfolioLinePlaceholder draws a lightweight CSS line chart until charting libraries are added.
export function PortfolioLinePlaceholder({ points }: { points: ChartPoint[] }) {
  const polyline = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - point.value;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Portfolio Trajectory</h2>
          <p className="text-xs text-muted-foreground">12-month value curve</p>
        </div>
        <span className="rounded-xl bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">+16.4%</span>
      </div>
      <svg className="h-56 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Portfolio trajectory line chart">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${polyline} 100,100`} fill="url(#lineFill)" stroke="none" />
        <polyline points={polyline} fill="none" stroke="#16a34a" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-1 text-xs text-muted-foreground sm:grid-cols-6">
        {points.filter((_, index) => index % 2 === 0).map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </section>
  );
}
