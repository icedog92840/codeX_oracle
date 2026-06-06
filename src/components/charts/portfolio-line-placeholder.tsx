"use client";

import { useMemo, useState } from "react";
import type { ChartPoint } from "@/lib/types/dashboard";

// PortfolioLinePlaceholder renders an interactive CSV-estimated portfolio value chart.
export function PortfolioLinePlaceholder({ points }: { points: ChartPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const axisLabels = useMemo(() => buildAxisLabels(points), [points]);
  const plottedPoints = useMemo(() => buildPlottedPoints(points), [points]);
  const polyline = plottedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const fillPath = plottedPoints.length > 0 ? `8,88 ${polyline} 98,88` : "";

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Portfolio Trajectory</h2>
          <p className="text-xs text-muted-foreground">CSV-estimated month-end portfolio value</p>
        </div>
        <span className="rounded-xl bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">CSV</span>
      </div>

      <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-2">
        <div className="flex h-64 flex-col justify-between py-2 text-right font-mono text-xs text-muted-foreground">
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="relative h-64">
          {activePoint && activeIndex !== null ? (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border bg-[#191929] px-3 py-2 text-xs shadow-[0_18px_45px_rgba(0,0,0,0.34)]"
              style={{
                left: `${Math.min(Math.max(plottedPoints[activeIndex]?.x ?? 8, 12), 80)}%`,
                top: `${Math.max((plottedPoints[activeIndex]?.y ?? 12) - 10, 4)}%`,
              }}
            >
              <p className="font-medium text-primary">{activePoint.label}</p>
              <p className="mt-1 font-mono text-foreground">{formatCurrency(activePoint.amount)}</p>
            </div>
          ) : null}

          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="CSV-estimated portfolio value line chart"
            onPointerLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#38d5ff" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[12, 31, 50, 69, 88].map((y) => (
              <line key={y} x1="8" x2="98" y1={y} y2={y} stroke="rgba(155,163,184,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <polyline points={fillPath} fill="url(#lineFill)" stroke="none" />
            <polyline points={polyline} fill="none" stroke="#38d5ff" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            {plottedPoints.map((point, index) => (
              <circle
                key={`${points[index].label}-${points[index].amount}`}
                cx={point.x}
                cy={point.y}
                r={activeIndex === index ? 1.8 : 1.1}
                fill={activeIndex === index ? "#f3f6ff" : "#38d5ff"}
                stroke="#171724"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                tabIndex={0}
                aria-label={`${points[index].label}: ${formatCurrency(points[index].amount)}`}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onPointerEnter={() => setActiveIndex(index)}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 pl-[66px] text-xs text-muted-foreground sm:grid-cols-6">
        {points.filter((_, index) => index % 2 === 0).map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </section>
  );
}

// buildPlottedPoints maps normalized chart data into SVG coordinates.
function buildPlottedPoints(points: ChartPoint[]) {
  return points.map((point, index) => {
    const x = 8 + (index / Math.max(points.length - 1, 1)) * 90;
    const y = 88 - (point.value / 100) * 76;

    return { x, y };
  });
}

// buildAxisLabels creates max/mid/min value tags for the left side of the chart.
function buildAxisLabels(points: ChartPoint[]) {
  if (points.length === 0) {
    return ["$0", "$0", "$0"];
  }

  const amounts = points.map((point) => point.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const mid = (min + max) / 2;

  return [max, mid, min].map(formatCompactCurrency);
}

// formatCurrency renders tooltip values as full dollars.
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

// formatCompactCurrency keeps axis labels tight enough for the dashboard.
function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
