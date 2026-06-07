"use client";

import { useMemo, useState } from "react";
import type { ChartPoint } from "@/lib/types/dashboard";

// PortfolioLinePlaceholder renders an interactive CSV-estimated portfolio value chart.
export function PortfolioLinePlaceholder({ points }: { points: ChartPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const chart = useMemo(() => buildChartGeometry(points), [points]);

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Portfolio Trajectory</h2>
          <p className="text-xs text-muted-foreground">CSV-estimated month-end portfolio value</p>
        </div>
        <span className="rounded-xl bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">CSV</span>
      </div>

      <div className="relative">
        {activePoint && activeIndex !== null ? (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border bg-[#191929] px-3 py-2 text-xs shadow-[0_18px_45px_rgba(0,0,0,0.34)] ring-1 ring-primary/10"
            style={{
              left: `${Math.min(Math.max(((chart.points[activeIndex]?.x ?? 56) / 720) * 100, 10), 74)}%`,
              top: `${Math.max(((chart.points[activeIndex]?.y ?? 48) / 280) * 100 - 10, 3)}%`,
            }}
          >
            <p className="font-medium text-primary">{activePoint.label}</p>
            <p className="mt-1 font-mono text-foreground">{formatCurrency(activePoint.amount)}</p>
          </div>
        ) : null}

        <svg
          className="h-72 w-full overflow-visible"
          viewBox="0 0 720 280"
          role="img"
          aria-label="CSV-estimated portfolio value line chart"
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="portfolioTrajectoryFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38d5ff" stopOpacity="0.24" />
              <stop offset="72%" stopColor="#7c3aed" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.grid.map((line) => (
            <g key={line.label}>
              <line x1="58" x2="700" y1={line.y} y2={line.y} stroke="#38384d" strokeDasharray="4 6" />
              <text x="0" y={line.y + 4} className="fill-muted-foreground font-mono text-[10px]">{line.label}</text>
            </g>
          ))}
          <path d={chart.fillPath} fill="url(#portfolioTrajectoryFill)" />
          <path d={chart.path} fill="none" stroke="#38d5ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {chart.points.map((point, index) => (
            <circle
              key={`${points[index].label}-${points[index].amount}`}
              cx={point.x}
              cy={point.y}
              r={activeIndex === index ? 4.2 : 2.4}
              className={activeIndex === index ? "fill-foreground" : "fill-primary"}
              stroke="#171724"
              strokeWidth="2"
              tabIndex={0}
              aria-label={`${points[index].label}: ${formatCurrency(points[index].amount)}`}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onPointerEnter={() => setActiveIndex(index)}
            />
          ))}
          {chart.xLabels.map((label) => (
            <text key={label.label} x={label.x} y="270" textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
              {label.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

// buildChartGeometry converts portfolio values into Analyzer-style SVG paths, grid lines, and labels.
function buildChartGeometry(points: ChartPoint[]) {
  if (points.length === 0) {
    return {
      fillPath: "",
      grid: [],
      path: "",
      points: [],
      xLabels: [],
    };
  }

  const amounts = points.map((point) => point.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const spread = Math.max(max - min, 1);
  const left = 58;
  const right = 700;
  const top = 24;
  const bottom = 236;
  const plottedPoints = points.map((point, index) => ({
    x: points.length <= 1 ? left : left + (index / (points.length - 1)) * (right - left),
    y: bottom - ((point.amount - min) / spread) * (bottom - top),
  }));
  const path = plottedPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const fillPath = plottedPoints.length > 0
    ? `${path} L ${plottedPoints.at(-1)?.x.toFixed(2)} ${bottom} L ${left} ${bottom} Z`
    : "";
  const xLabelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  return {
    fillPath,
    path,
    points: plottedPoints,
    grid: Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const value = max - (max - min) * ratio;

      return {
        y: top + ratio * (bottom - top),
        label: formatCompactCurrency(value),
      };
    }),
    xLabels: xLabelIndexes.map((index) => ({
      x: plottedPoints[index]?.x ?? left,
      label: points[index]?.label ?? "",
    })),
  };
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
