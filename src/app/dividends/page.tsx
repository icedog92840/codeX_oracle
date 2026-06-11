import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, HelpCircle } from "lucide-react";
import { getDividendTrackingData, parseDividendSortQuery, parseDividendTrendMode, parseDividendYear } from "@/lib/data/dividend-tracking";
import type { DividendAssetRow, DividendSortDirection, DividendSortKey, DividendTrackingData, DividendTrendMode, DividendTrendPoint } from "@/lib/data/dividend-tracking";
import { cn } from "@/lib/utils";

// MonthSortKeys maps visible month columns to their URL sort keys.
const monthSortKeys: DividendSortKey[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// HiddenSortOptions are popout-only metrics that can still drive row order.
const hiddenSortOptions: { key: DividendSortKey; label: string; defaultDirection: DividendSortDirection }[] = [
  { key: "yoc", label: "Annual YOC", defaultDirection: "desc" },
  { key: "dripShares", label: "DRIP Shares", defaultDirection: "desc" },
];

// DividendsPage renders CSV-backed dividend income tracking.
export default async function DividendsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const dividendData = getDividendTrackingData(
    parseDividendYear(resolvedSearchParams),
    parseDividendSortQuery(resolvedSearchParams),
    parseDividendTrendMode(resolvedSearchParams),
  );
  const trendPoints = dividendData.trendMode === "annual" ? dividendData.annualTrendPoints : dividendData.months;
  const maxTrendTotal = Math.max(...trendPoints.map((point) => point.total), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Dividend Tracking</h1>
          <p className="text-sm text-muted-foreground">CSV-backed dividend matrix, DRIP metrics, calendar, and payout trend</p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          <Link
            className={cn(
              "rounded-xl border px-2 py-2 text-center font-mono text-xs transition-colors hover:border-primary/50 hover:bg-secondary sm:px-3",
              dividendData.selectedRangeKey === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
            href="/dividends?year=all"
          >
            ALL
          </Link>
          {dividendData.availableYears.map((year) => (
            <Link
              key={year}
              className={cn(
                "rounded-xl border px-2 py-2 text-center font-mono text-xs transition-colors hover:border-primary/50 hover:bg-secondary sm:px-3",
                String(year) === dividendData.selectedRangeKey ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
              href={`/dividends?year=${year}`}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={dividendData.selectedMetricLabel} value={dividendData.totalForYear} detail="Cash dividends paid in selected range" tone="positive" />
        <Metric label="All-Time Dividends" value={dividendData.allTimeTotal} detail="Total CDIV cash in the CSV" tone="positive" />
        <Metric label="Dividend Payers" value={String(dividendData.payerCount)} detail="Assets with dividend rows this year" tone="neutral" />
        <Metric label="YoY Change" value={dividendData.yearOverYearChange} detail="Selected year vs previous year" tone={dividendData.yearOverYearTone} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">{dividendData.trendMode === "annual" ? "Annual Payout Trend" : "Monthly Payout Trend"}</h2>
              <p className="text-xs text-muted-foreground">
                {dividendData.trendMode === "annual" ? "Dividend totals by calendar year" : "Selected-range dividend totals by month"}
              </p>
            </div>
            <TrendModeSwitch dividendData={dividendData} />
          </div>
          <div className="mt-4 flex h-56 items-stretch gap-2 border-b border-l px-2 pb-2">
            {trendPoints.map((point, index) => (
              <TrendBar key={point.label} point={point} maxTotal={maxTrendTotal} index={index} count={trendPoints.length} />
            ))}
          </div>
        </section>

        <DividendProgressionLineChart points={dividendData.months} selectedRangeLabel={dividendData.selectedRangeLabel} />
      </div>

      <section className="lg:hidden">
        <div className="mb-2 flex flex-col items-start gap-2">
          <div>
            <h2 className="text-base font-semibold">Dividend Assets</h2>
            <p className="text-xs text-muted-foreground">Stacked mobile view with selected-range totals</p>
          </div>
          <HiddenMetricSortDropdown dividendData={dividendData} />
        </div>
        <div className="grid gap-3">
          {dividendData.assetRows.map((row, rowIndex) => (
            <DividendMobileCard
              key={row.ticker}
              row={row}
              openUp={rowIndex >= Math.max(dividendData.assetRows.length - 3, 0)}
              yieldOnCostYear={dividendData.yieldOnCostYear}
            />
          ))}
        </div>
      </section>

      <section className="relative hidden overflow-visible rounded-xl border bg-card/90 shadow-[0_18px_45px_rgba(0,0,0,0.20)] lg:block">
        <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Dividend Matrix</h2>
            <p className="text-xs text-muted-foreground">Monthly cash dividends by asset with cost-basis and DRIP context</p>
          </div>
          <HiddenMetricSortDropdown dividendData={dividendData} />
        </div>
        <div className="overflow-visible">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[8%]" />
              {dividendData.months.map((month) => (
                <col key={month.label} className="w-[6.5%]" />
              ))}
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-secondary/90 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left font-medium">
                  <SortableHeader dividendData={dividendData} sortKey="ticker" label="Ticker" align="left" defaultDirection="asc" />
                </th>
                {dividendData.months.map((month, index) => (
                  <th key={month.label} className="px-1 py-2 text-right font-medium">
                    <SortableHeader dividendData={dividendData} sortKey={monthSortKeys[index]} label={month.label} align="right" defaultDirection="desc" />
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">
                  <SortableHeader dividendData={dividendData} sortKey="total" label="Total" align="right" defaultDirection="desc" />
                </th>
              </tr>
            </thead>
            <tbody>
              {dividendData.assetRows.map((row, rowIndex) => (
                <tr key={row.ticker} className="border-t transition-colors hover:bg-secondary/45">
                  <td className="relative px-2 py-2 font-semibold">
                    <TickerMetricPopover
                      row={row}
                      openUp={rowIndex >= Math.max(dividendData.assetRows.length - 5, 0)}
                      yieldOnCostYear={dividendData.yieldOnCostYear}
                    />
                  </td>
                  {row.displayMonthly.map((amount, index) => (
                    <td key={`${row.ticker}-${dividendData.months[index].label}`} className="truncate px-1 py-2 text-right font-mono">
                      {amount}
                    </td>
                  ))}
                  <td className="truncate px-2 py-2 text-right font-mono font-semibold text-emerald-300">{row.displayTotal}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-secondary/70 text-xs">
              <tr>
                <td className="px-2 py-2 font-semibold text-primary">Total</td>
                {dividendData.months.map((month) => (
                  <td key={`total-${month.label}`} className="truncate px-1 py-2 text-right font-mono font-semibold text-emerald-300">
                    {month.displayTotal}
                  </td>
                ))}
                <td className="truncate px-2 py-2 text-right font-mono font-semibold text-emerald-300">{dividendData.totalForYear}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card/90 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
        <div className="border-b px-3 py-2">
          <h2 className="text-base font-semibold">Dividend Calendar</h2>
          <p className="text-xs text-muted-foreground">Most recent payments {dividendData.calendarRangeLabel}</p>
        </div>
        <div className="pill-scrollbar scroll-glow max-h-72 overflow-y-auto overflow-x-hidden">
          {dividendData.calendarEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-[76px_58px_1fr_82px] gap-2 border-b px-3 py-2 text-xs last:border-b-0">
              <span className="font-mono text-muted-foreground">{event.date}</span>
              <span className="font-semibold">{event.ticker}</span>
              <span className="truncate text-muted-foreground" title={event.description}>{event.description}</span>
              <span className="text-right font-mono text-emerald-300">{event.amount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// DividendProgressionLineChart renders a cumulative month-over-month line graph for selected-range dividends.
function DividendProgressionLineChart({ points, selectedRangeLabel }: { points: DividendTrendPoint[]; selectedRangeLabel: string }) {
  const cumulativePoints = buildCumulativeDividendPoints(points);
  const chart = buildDividendLineGeometry(cumulativePoints);

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Dividend Progression</h2>
          <p className="text-xs text-muted-foreground">Cumulative month-over-month dividend cash in {selectedRangeLabel}</p>
        </div>
        <span className="soft-pulse inline-flex rounded-xl bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">Cumulative</span>
      </div>

      <svg className="h-64 w-full overflow-visible" viewBox="0 0 720 260" role="img" aria-label="Cumulative dividend month-over-month progression line chart">
        <defs>
          <linearGradient id="dividendProgressionFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#25e0bf" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#38d5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {chart.grid.map((line) => (
          <g key={line.label}>
            <line x1="58" x2="700" y1={line.y} y2={line.y} stroke="#38384d" strokeDasharray="4 6" />
            <text x="0" y={line.y + 4} className="fill-muted-foreground font-mono text-[10px]">{line.label}</text>
          </g>
        ))}
        <path d={chart.fillPath} fill="url(#dividendProgressionFill)" />
        <path d={chart.path} fill="none" stroke="#25e0bf" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {chart.points.map((point, index) => (
          <g key={`${cumulativePoints[index].label}-${cumulativePoints[index].total}`} className="group/point">
            <circle cx={point.x} cy={point.y} r="3" className="fill-emerald-300 transition-transform group-hover/point:scale-125" stroke="#171724" strokeWidth="2" />
            <g className="pointer-events-none opacity-0 transition-opacity group-hover/point:opacity-100">
              <rect x={Math.min(Math.max(point.x - 44, 62), 612)} y={Math.max(point.y - 48, 4)} width="88" height="36" rx="10" className="fill-[#191929] stroke-border" />
              <text x={Math.min(Math.max(point.x, 106), 656)} y={Math.max(point.y - 27, 25)} textAnchor="middle" className="fill-foreground font-mono text-[10px]">
                {cumulativePoints[index].displayTotal}
              </text>
              <text x={Math.min(Math.max(point.x, 106), 656)} y={Math.max(point.y - 13, 39)} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {cumulativePoints[index].label}
              </text>
            </g>
          </g>
        ))}
        {chart.xLabels.map((label) => (
          <text key={label.label} x={label.x} y="250" textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
            {label.label}
          </text>
        ))}
      </svg>
    </section>
  );
}

// buildCumulativeDividendPoints converts monthly totals into Jan, Jan+Feb, Jan+Feb+Mar style values.
function buildCumulativeDividendPoints(points: DividendTrendPoint[]): DividendTrendPoint[] {
  let runningTotal = 0;

  return points.map((point) => {
    runningTotal += point.total;

    return {
      ...point,
      total: runningTotal,
      displayTotal: formatFullCurrency(runningTotal),
    };
  });
}

// DividendMobileCard renders one dividend asset without requiring horizontal table scrolling.
function DividendMobileCard({ row, openUp, yieldOnCostYear }: { row: DividendAssetRow; openUp: boolean; yieldOnCostYear: number }) {
  const paidMonths = row.displayMonthly
    .map((amount, index) => ({ amount, label: monthSortKeys[index].toUpperCase() }))
    .filter((month) => month.amount !== "-");

  return (
    <article className="min-w-0 rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="min-w-0">
        <div className="min-w-0">
          <TickerMetricPopover row={row} openUp={openUp} yieldOnCostYear={yieldOnCostYear} />
          <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">{row.name}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileStat label="Total" value={row.displayTotal} tone="positive" />
        <MobileStat label="DRIP Shares" value={row.dripShares} />
        <MobileStat label="Avg Cost" value={row.standardAverageCost} />
        <MobileStat label="Highest Payout" value={row.highestPayout} />
        <MobileStat label="Weekly Avg" value={formatFullCurrency(row.total / 52)} />
      </div>
      <div className="mt-3">
        <IncomeProgressMeters row={row} yieldOnCostYear={yieldOnCostYear} compact />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {paidMonths.slice(0, 6).map((month) => (
          <div key={month.label} className="rounded-lg bg-secondary/45 px-2 py-1.5">
            <p className="font-mono text-[10px] text-muted-foreground">{month.label}</p>
            <p className="truncate font-mono text-xs font-semibold">{month.amount}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

// MobileStat renders one compact mobile-only dividend card metric.
function MobileStat({ label, value, tone }: { label: string; value: string; tone?: "positive" }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary/45 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("truncate font-mono text-xs font-semibold text-foreground", tone === "positive" && "text-emerald-300")}>{value}</p>
    </div>
  );
}

// TrendModeSwitch toggles the payout chart between monthly and annual totals.
function TrendModeSwitch({ dividendData }: { dividendData: DividendTrackingData }) {
  return (
    <div className="flex rounded-xl border bg-[#191929] p-1">
      {(["monthly", "annual"] as DividendTrendMode[]).map((mode) => (
        <Link
          key={mode}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs capitalize transition-colors hover:bg-secondary",
            dividendData.trendMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          href={buildDividendTrendHref(dividendData, mode)}
        >
          {mode}
        </Link>
      ))}
    </div>
  );
}

// TrendBar renders one payout bar with a custom hover tooltip.
function TrendBar({ point, maxTotal, index, count }: { point: DividendTrendPoint; maxTotal: number; index: number; count: number }) {
  const height = Math.max((point.total / maxTotal) * 100, point.total > 0 ? 8 : 0);
  const tooltipPosition = index === 0 ? "left-0" : index === count - 1 ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div className="group/bar relative flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
      <div
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+8px)] z-30 w-32 rounded-xl border bg-[#191929] p-2 text-center opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.34)] ring-1 ring-primary/10 transition-opacity group-hover/bar:opacity-100",
          tooltipPosition,
        )}
      >
        <p className="font-mono text-xs font-semibold text-foreground">{point.displayTotal}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{point.label}</p>
      </div>
      <div
        className="w-full rounded-t-xl bg-[linear-gradient(180deg,#38d5ff,#7c3aed)] transition-[height,filter] duration-200 group-hover/bar:brightness-125"
        style={{ height: `${height}%` }}
        aria-label={`${point.label}: ${point.displayTotal}`}
      />
      <span className="truncate text-center font-mono text-[10px] text-muted-foreground">{point.label}</span>
    </div>
  );
}

// buildDividendLineGeometry converts monthly dividend totals into SVG chart coordinates.
function buildDividendLineGeometry(points: DividendTrendPoint[]) {
  const totals = points.map((point) => point.total);
  const max = Math.max(...totals, 1);
  const min = Math.min(...totals, 0);
  const spread = Math.max(max - min, 1);
  const left = 58;
  const right = 700;
  const top = 22;
  const bottom = 218;
  const plottedPoints = points.map((point, index) => ({
    x: points.length <= 1 ? left : left + (index / (points.length - 1)) * (right - left),
    y: bottom - ((point.total - min) / spread) * (bottom - top),
  }));
  const path = plottedPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const fillPath = plottedPoints.length > 0
    ? `${path} L ${plottedPoints.at(-1)?.x.toFixed(2)} ${bottom} L ${left} ${bottom} Z`
    : "";
  const xLabelIndexes = Array.from(new Set([0, 2, 5, 8, 11])).filter((index) => index < points.length);

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

// SortableHeader renders a dividend matrix header link with active sort direction.
function SortableHeader({
  dividendData,
  sortKey,
  label,
  align,
  defaultDirection,
}: {
  dividendData: DividendTrackingData;
  sortKey: DividendSortKey;
  label: string;
  align: "left" | "right";
  defaultDirection: DividendSortDirection;
}) {
  const isActive = dividendData.sort.key === sortKey;
  const nextDirection = isActive ? toggleDirection(dividendData.sort.direction) : defaultDirection;

  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1 rounded-lg outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
        align === "right" && "justify-end",
      )}
      href={buildDividendSortHref(dividendData, sortKey, nextDirection)}
      aria-label={`Sort dividend matrix by ${label}`}
    >
      {label}
      <SortIcon isActive={isActive} direction={dividendData.sort.direction} />
    </Link>
  );
}

// HiddenMetricSortDropdown provides sorting for metrics that live in ticker popouts.
function HiddenMetricSortDropdown({ dividendData }: { dividendData: DividendTrackingData }) {
  const activeHiddenOption = hiddenSortOptions.find((option) => option.key === dividendData.sort.key);

  return (
    <details className="group relative w-fit">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border bg-[#191929] px-3 py-2 text-xs outline-none transition-colors hover:border-primary/60 hover:bg-[#24243a] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 group-open:border-primary/70 group-open:bg-[#24243a] [&::-webkit-details-marker]:hidden">
        <span className="font-mono">{activeHiddenOption ? `Sort: ${activeHiddenOption.label}` : "Sort popout metrics"}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 rounded-xl border bg-[#191929] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.34)] ring-1 ring-primary/10">
        {hiddenSortOptions.map((option) => {
          const isActive = dividendData.sort.key === option.key;
          const nextDirection = isActive ? toggleDirection(dividendData.sort.direction) : option.defaultDirection;

          return (
            <Link
              key={option.key}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-xs outline-none transition-colors hover:bg-[#24243a] hover:text-foreground focus-visible:bg-[#24243a] focus-visible:text-foreground",
                isActive ? "bg-[linear-gradient(135deg,#38d5ff,#7c3aed)] text-white shadow-[0_0_18px_rgba(56,213,255,0.20)] hover:text-white" : "text-muted-foreground",
              )}
              href={buildDividendSortHref(dividendData, option.key, nextDirection)}
            >
              <span>{option.label}</span>
              {isActive ? <SortIcon isActive direction={dividendData.sort.direction} /> : null}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

// SortIcon shows the active sort direction beside a sortable control.
function SortIcon({ isActive, direction }: { isActive: boolean; direction: DividendSortDirection }) {
  if (!isActive) {
    return <ArrowUpDown className="size-3 opacity-45" aria-hidden="true" />;
  }

  if (direction === "asc") {
    return <ArrowUp className="size-3 text-primary" aria-hidden="true" />;
  }

  return <ArrowDown className="size-3 text-primary" aria-hidden="true" />;
}

// buildDividendSortHref preserves the active range while applying a new matrix sort.
function buildDividendSortHref(dividendData: DividendTrackingData, sortKey: DividendSortKey, direction: DividendSortDirection) {
  const params = new URLSearchParams();
  params.set("year", dividendData.selectedRangeKey);
  params.set("sort", sortKey);
  params.set("direction", direction);
  params.set("trend", dividendData.trendMode);

  return `/dividends?${params.toString()}`;
}

// buildDividendTrendHref preserves the active range and matrix sort while switching chart mode.
function buildDividendTrendHref(dividendData: DividendTrackingData, trendMode: DividendTrendMode) {
  const params = new URLSearchParams();
  params.set("year", dividendData.selectedRangeKey);
  params.set("sort", dividendData.sort.key);
  params.set("direction", dividendData.sort.direction);
  params.set("trend", trendMode);

  return `/dividends?${params.toString()}`;
}

// toggleDirection flips an active sort direction for repeated header clicks.
function toggleDirection(direction: DividendSortDirection) {
  return direction === "asc" ? "desc" : "asc";
}

// TickerMetricPopover makes each ticker a hover/click target for the advanced dividend metrics.
function TickerMetricPopover({ row, openUp, yieldOnCostYear }: { row: DividendAssetRow; openUp: boolean; yieldOnCostYear: number }) {
  return (
    <details className="group relative w-fit">
      <summary className="cursor-pointer list-none rounded-lg px-1 text-primary outline-none transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
        {row.ticker}
      </summary>
      <div
        className={cn(
          "pointer-events-none absolute left-0 z-40 w-[min(calc(100vw-48px),330px)] rounded-xl border bg-[#191929] p-3 opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.38)] ring-1 ring-primary/10 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-open:pointer-events-auto group-open:opacity-100",
          openUp ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
        )}
      >
        <div className="mb-3 border-b pb-2">
          <p className="font-mono text-sm font-semibold text-foreground">{row.ticker}</p>
          <p className="truncate text-xs text-muted-foreground">{row.name}</p>
        </div>
        <div className="space-y-2">
          <MetricDetail
            label="Starting Date"
            value={row.startingDate}
            description="The first date this ticker appears in the CSV ledger."
            formula="No formula. This is the earliest CSV row found for the ticker."
          />
          <MetricDetail
            label="DRIP Shares"
            value={row.dripShares}
            description="Shares acquired through dividend reinvestment rows."
            formula='Sum of Buy quantities where the description contains "Dividend Reinvestment".'
          />
          <MetricDetail
            label="Average Cost"
            value={row.standardAverageCost}
            description="Current average cost basis for the open position."
            formula="Open cost basis divided by open shares."
          />
          <MetricDetail
            label="Adjusted Average"
            value={row.adjustedAverageCost}
            description="Average cost after removing the dollars that came from DRIP purchases."
            formula="(Open cost basis minus DRIP cost) divided by open shares."
          />
          <IncomeProgressMeters row={row} yieldOnCostYear={yieldOnCostYear} />
          <MetricDetail
            label="Highest Dividend Payout"
            value={row.highestPayout}
            description="The largest single cash dividend payment ever received for this ticker in the CSV."
            formula="Maximum historical CDIV amount for this ticker across the full transaction log."
          />
          <MetricDetail
            label="Monthly Average"
            value={formatFullCurrency(row.total / 12)}
            description="Average monthly dividend income for this ticker in the currently selected range."
            formula="Selected-range dividend total divided by 12 calendar months."
          />
          <RecentDividendList row={row} />
        </div>
      </div>
    </details>
  );
}

// IncomeProgressMeters pairs annual YOC with lifetime distribution payback in one reusable visual block.
function IncomeProgressMeters({
  compact = false,
  row,
  yieldOnCostYear,
}: {
  compact?: boolean;
  row: DividendAssetRow;
  yieldOnCostYear: number;
}) {
  return (
    <div className={cn("space-y-2", compact ? "rounded-xl border bg-secondary/30 p-2" : "rounded-lg border border-border/70 bg-secondary/35 p-2")}>
      <IncomeProgressMeter
        detail={`${row.annualDividendIncome} received / ${row.yieldCostBasis} remaining cash-funded basis`}
        description="Annual yield on cost compares distributions received in this calendar year with the remaining non-DRIP cash cost basis."
        formula={`${yieldOnCostYear} distributions / remaining non-DRIP cost basis`}
        label={`${yieldOnCostYear} YOC`}
        maxValue={row.yieldOnCostScaleMax}
        scaleLabel={`0-${formatPercentValue(row.yieldOnCostScaleMax)}`}
        tone="annual"
        value={row.yieldOnCostValue}
        valueLabel={row.yieldOnCost}
      />
      <IncomeProgressMeter
        detail={`${row.lifetimeDistributions} received / ${row.lifetimeCashPurchases} cash purchased`}
        description="Distribution Payback shows how much of lifetime cash-funded purchases has been returned through historical distributions. It can include return of capital."
        formula="All historical distributions / lifetime non-DRIP cash purchases"
        label="Distribution Payback"
        maxValue={1}
        scaleLabel={row.distributionPaybackValue >= 1 ? "Payback reached" : "0-100% milestone"}
        tone="payback"
        value={row.distributionPaybackValue}
        valueLabel={row.distributionPayback}
      />
    </div>
  );
}

// IncomeProgressMeter renders one animated percentage bar with an accessible formula tooltip.
function IncomeProgressMeter({
  description,
  detail,
  formula,
  label,
  maxValue,
  scaleLabel,
  tone,
  value,
  valueLabel,
}: {
  description: string;
  detail: string;
  formula: string;
  label: string;
  maxValue: number;
  scaleLabel: string;
  tone: "annual" | "payback";
  value: number;
  valueLabel: string;
}) {
  const fillPercent = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const milestoneReached = tone === "payback" && value >= 1;

  return (
    <div className="group/income-meter relative rounded-lg bg-[#171727]/75 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("font-mono text-xs font-bold", tone === "annual" ? "text-primary" : milestoneReached ? "text-emerald-200" : "text-emerald-300")}>
            {valueLabel}
          </span>
          <span className="rounded-full text-muted-foreground outline-none transition-colors group-hover/income-meter:text-primary" tabIndex={0}>
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className={cn("income-meter-track mt-2 h-2 overflow-hidden rounded-full", milestoneReached && "ring-1 ring-emerald-300/50")}>
        <div
          className={cn(
            "income-meter-fill h-full rounded-full",
            tone === "annual" ? "income-meter-annual" : "income-meter-payback",
            milestoneReached && "income-meter-complete",
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground">
        <span>0%</span>
        <span>{scaleLabel}</span>
      </div>

      <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border bg-[#24243a] p-3 text-xs opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition-opacity group-hover/income-meter:opacity-100 group-focus-within/income-meter:opacity-100">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="mt-1 leading-5 text-muted-foreground">{description}</p>
        <p className="mt-2 rounded-lg border bg-[#191929] p-2 font-mono text-[11px] leading-4 text-primary">{formula}</p>
      </div>
    </div>
  );
}

// RecentDividendList shows the last three dividend payouts inside the ticker popout.
function RecentDividendList({ row }: { row: DividendAssetRow }) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/35 p-2">
      <p className="mb-2 text-xs font-semibold text-foreground">Last Three Dividends</p>
      <div className="space-y-1.5">
        {row.recentDividends.map((event) => (
          <div key={event.id} className="grid grid-cols-[70px_1fr_auto] items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">{event.date}</span>
            <span className="truncate text-muted-foreground" title={event.description}>{event.description}</span>
            <span className="font-mono font-semibold text-emerald-300">{event.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// MetricDetail renders one metric row plus a nested explanatory hover card.
function MetricDetail({
  label,
  value,
  description,
  formula,
}: {
  label: string;
  value: string;
  description: string;
  formula: string;
}) {
  return (
    <div className="group/metric relative grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/70">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
      <span className="rounded-full text-muted-foreground outline-none transition-colors group-hover/metric:text-primary" tabIndex={0}>
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </span>
      <div className="pointer-events-none absolute left-[calc(100%+10px)] top-0 z-50 w-64 rounded-xl border bg-[#24243a] p-3 text-xs opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.36)] transition-opacity group-hover/metric:opacity-100 group-focus-within/metric:opacity-100">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-muted-foreground">{description}</p>
        <p className="mt-2 font-mono text-[11px] leading-4 text-primary">{formula}</p>
      </div>
    </div>
  );
}

// Metric renders one compact dividend KPI card.
function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-mono text-xl font-semibold", tone === "positive" && "text-emerald-300", tone === "negative" && "text-rose-300")}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

// formatCompactCurrency keeps chart axis labels readable in a dense card.
function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

// formatFullCurrency renders exact dollar values for cumulative chart tooltips.
function formatFullCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

// formatPercentValue renders raw decimal ratios for meter scale labels.
function formatPercentValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}
