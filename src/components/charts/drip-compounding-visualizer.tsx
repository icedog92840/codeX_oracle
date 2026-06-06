"use client";

import { useMemo, useState } from "react";
import type { DripCurvePoint, DripVisualizerData } from "@/lib/data/drip-visualizer";
import { cn } from "@/lib/utils";

// GeometryPoint stores one plotted point with SVG coordinates attached.
type GeometryPoint = DripCurvePoint & {
  x: number;
  withY: number;
  withoutY: number;
};

// ChartGeometry stores all SVG paths and labels needed by the visual chart.
type ChartGeometry = {
  points: GeometryPoint[];
  withPath: string;
  withoutPath: string;
  projectionBoundaryX: number | null;
  xLabels: { label: string; x: number }[];
  yLabels: { label: string; y: number }[];
};

// DripCompoundingVisualizer renders an interactive DRIP vs no-DRIP comparison chart.
export function DripCompoundingVisualizer({ dripData }: { dripData: DripVisualizerData }) {
  const [yearSpan, setYearSpan] = useState(dripData.defaultYearSpan);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const visiblePoints = useMemo(() => dripData.points.slice(0, yearSpan), [dripData.points, yearSpan]);
  const chartGeometry = useMemo(() => buildChartGeometry(visiblePoints, dripData.historicalPointCount), [dripData.historicalPointCount, visiblePoints]);
  const hoveredPoint = hoverIndex === null ? null : visiblePoints[hoverIndex] ?? null;
  const terminalPoint = visiblePoints.at(-1);
  const terminalDifference = terminalPoint ? terminalPoint.withDrip - terminalPoint.withoutDrip : 0;
  const visibleProjectedYears = Math.max(yearSpan - dripData.historicalPointCount, 0);

  return (
    <section className="overflow-hidden rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-semibold text-primary">{dripData.selectedTicker}</p>
            <p className="w-full truncate text-sm text-muted-foreground">{dripData.selectedName}</p>
          </div>
          <div className="grid gap-2 text-xs">
            <MetricLine label="Starting Date" value={dripData.startingDate} />
            <MetricLine label="Current Shares" value={dripData.currentShares} />
            <MetricLine label="DRIP Shares" value={dripData.dripShares} />
            <MetricLine label="Latest Price" value={dripData.currentPrice} />
            <MetricLine label="TTM Dividends" value={dripData.ttmDividends} />
            <MetricLine label="Estimated Yield" value={dripData.estimatedYield} />
            <MetricLine label="Dividend Growth" value={dripData.estimatedDividendGrowth} />
            <MetricLine label="Price Growth" value={dripData.estimatedPriceGrowth} />
          </div>
          <div className="rounded-xl border bg-[#191929] p-3 text-xs">
            <p className="font-semibold text-foreground">Projection Assumptions</p>
            <p className="mt-2 text-muted-foreground">
              Future years use the latest CSV price, trailing dividends, and capped CSV-derived growth estimates.
            </p>
            <div className="mt-3 grid min-w-0 gap-2">
              <MetricLine label="Projected Years" value={String(dripData.projectedPointCount)} />
              <MetricLine label="Terminal DRIP" value={dripData.terminalWithDrip} />
              <MetricLine label="Terminal No DRIP" value={dripData.terminalWithoutDrip} />
              <MetricLine label="Terminal Gap" value={dripData.terminalDifference} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <LegendSwatch label="DRIP Active" className="bg-primary" />
              <LegendSwatch label="No DRIP" className="bg-violet-500" />
              <LegendSwatch label="Projected" className="bg-muted-foreground" />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {yearSpan} years · {visibleProjectedYears} projected
            </p>
          </div>

          <div className="relative h-72 rounded-xl border bg-[#191929] p-3">
            {hoveredPoint ? <PointTooltip point={hoveredPoint} /> : null}
            <svg className="h-full w-full overflow-visible" viewBox="0 0 720 260" role="img" aria-label="DRIP compounding comparison chart">
              <GridLines labels={chartGeometry.yLabels} />
              {chartGeometry.projectionBoundaryX ? (
                <g>
                  <line
                    x1={chartGeometry.projectionBoundaryX}
                    x2={chartGeometry.projectionBoundaryX}
                    y1="20"
                    y2="220"
                    stroke="#9ba3b8"
                    strokeDasharray="4 6"
                    opacity="0.55"
                  />
                  <text x={chartGeometry.projectionBoundaryX + 8} y="34" className="fill-muted-foreground font-mono text-[10px]">
                    projected
                  </text>
                </g>
              ) : null}
              <path d={chartGeometry.withPath} fill="none" stroke="#38d5ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              <path d={chartGeometry.withoutPath} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              {chartGeometry.points.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle
                    className="cursor-pointer fill-[#38d5ff] transition-opacity hover:opacity-100"
                    cx={point.x}
                    cy={point.withY}
                    r="3"
                    opacity={hoverIndex === index ? 1 : 0.72}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                  <circle
                    className="cursor-pointer fill-[#7c3aed] transition-opacity hover:opacity-100"
                    cx={point.x}
                    cy={point.withoutY}
                    r="3"
                    opacity={hoverIndex === index ? 1 : 0.72}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              ))}
              {chartGeometry.xLabels.map((label) => (
                <text key={label.label} x={label.x} y="250" textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                  {label.label}
                </text>
              ))}
            </svg>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Historical</span>
              <span className="max-w-[62%] truncate text-right font-mono text-foreground">
                {terminalPoint ? `${terminalPoint.label}: ${formatSignedCurrency(terminalDifference)}` : "Projected"}
              </span>
            </div>
            <input
              className="h-2 w-full cursor-pointer accent-primary"
              max={dripData.maxYearSpan}
              min={Math.min(3, dripData.maxYearSpan)}
              type="range"
              value={yearSpan}
              onChange={(event) => setYearSpan(Number(event.target.value))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// MetricLine renders one compact value in the visualizer sidebar.
function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-1 rounded-lg bg-secondary/45 px-2 py-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className="max-w-full truncate text-left font-mono font-semibold text-foreground sm:max-w-[58%] sm:text-right" title={value}>
        {value}
      </span>
    </div>
  );
}

// LegendSwatch renders a chart legend item.
function LegendSwatch({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

// PointTooltip renders the currently hovered chart point values.
function PointTooltip({ point }: { point: DripCurvePoint }) {
  return (
    <div className="absolute right-3 top-3 z-20 rounded-xl border bg-[#24243a] p-3 text-xs shadow-[0_18px_45px_rgba(0,0,0,0.34)]">
      <p className="font-mono font-semibold text-foreground">{point.label}</p>
      <p className="mt-2 text-primary">DRIP Active: <span className="font-mono">{point.withDripDisplay}</span></p>
      <p className="mt-1 text-violet-300">No DRIP: <span className="font-mono">{point.withoutDripDisplay}</span></p>
      <p className="mt-2 text-[10px] uppercase text-muted-foreground">{point.phase}</p>
    </div>
  );
}

// GridLines renders chart grid and y-axis labels.
function GridLines({ labels }: { labels: { label: string; y: number }[] }) {
  return (
    <g>
      {labels.map((label) => (
        <g key={label.label}>
          <line x1="52" x2="700" y1={label.y} y2={label.y} stroke="#38384d" strokeDasharray="4 6" />
          <text x="0" y={label.y + 4} className="fill-muted-foreground font-mono text-[10px]">
            {label.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// buildChartGeometry converts value points into SVG coordinates and paths.
function buildChartGeometry(points: DripCurvePoint[], historicalPointCount: number): ChartGeometry {
  const chartLeft = 52;
  const chartRight = 700;
  const chartTop = 20;
  const chartBottom = 220;
  const values = points.flatMap((point) => [point.withDrip, point.withoutDrip]);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const spread = Math.max(maxValue - minValue, 1);

  const geometryPoints = points.map((point, index) => {
    const x = points.length <= 1 ? chartLeft : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
    const withY = chartBottom - ((point.withDrip - minValue) / spread) * (chartBottom - chartTop);
    const withoutY = chartBottom - ((point.withoutDrip - minValue) / spread) * (chartBottom - chartTop);

    return {
      ...point,
      x,
      withY,
      withoutY,
    };
  });

  return {
    points: geometryPoints,
    withPath: buildPath(geometryPoints, "withY"),
    withoutPath: buildPath(geometryPoints, "withoutY"),
    projectionBoundaryX: geometryPoints.length > historicalPointCount ? geometryPoints[historicalPointCount]?.x ?? null : null,
    xLabels: buildXLabels(geometryPoints),
    yLabels: buildYLabels(minValue, maxValue, chartTop, chartBottom),
  };
}

// buildPath creates one SVG path from chart points.
function buildPath(points: GeometryPoint[], yKey: "withY" | "withoutY") {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point[yKey].toFixed(2)}`).join(" ");
}

// buildXLabels keeps x-axis labels sparse enough for dense views.
function buildXLabels(points: GeometryPoint[]) {
  const step = Math.max(Math.ceil(points.length / 6), 1);
  return points
    .filter((_, index) => index % step === 0 || index === points.length - 1)
    .map((point) => ({
      label: point.label,
      x: point.x,
    }));
}

// buildYLabels creates compact currency labels for the chart grid.
function buildYLabels(minValue: number, maxValue: number, chartTop: number, chartBottom: number) {
  return Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = maxValue - (maxValue - minValue) * ratio;
    const y = chartTop + ratio * (chartBottom - chartTop);

    return {
      label: formatCompactCurrency(value),
      y,
    };
  });
}

// formatCompactCurrency keeps chart axis labels compact.
function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

// formatSignedCurrency renders the current visible DRIP advantage beside the slider.
function formatSignedCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Math.abs(value));

  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
