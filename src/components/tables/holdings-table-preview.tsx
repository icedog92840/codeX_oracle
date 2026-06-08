"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2, RefreshCw, X } from "lucide-react";
import type { QuoteFreshnessMeta, QuoteFreshnessStatus } from "@/lib/market-data/market-data-provider";
import type { HoldingPreview } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// SortKey lists every sortable holdings table column.
type SortKey =
  | "averagePrice"
  | "currentPrice"
  | "marketValue"
  | "name"
  | "profitLoss"
  | "profitLossPercent"
  | "shares"
  | "ticker"
  | "totalCost"
  | "weight";

// SortState tracks the active column and direction selected by the user.
type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

// ColumnDefinition connects display labels to holding fields and sorting behavior.
type ColumnDefinition = {
  key: SortKey;
  label: string;
  align?: "left" | "right";
  kind: "text" | "number";
};

// Columns define the exact table order and supported sort targets.
const columns: ColumnDefinition[] = [
  { key: "ticker", label: "Ticker", kind: "text" },
  { key: "name", label: "Name", kind: "text" },
  { key: "shares", label: "Shares", kind: "number", align: "right" },
  { key: "weight", label: "Weight", kind: "number", align: "right" },
  { key: "averagePrice", label: "Avg Paid", kind: "number", align: "right" },
  { key: "totalCost", label: "Total Cost", kind: "number", align: "right" },
  { key: "currentPrice", label: "Price", kind: "number", align: "right" },
  { key: "marketValue", label: "Market Value", kind: "number", align: "right" },
  { key: "profitLoss", label: "P/L $", kind: "number", align: "right" },
  { key: "profitLossPercent", label: "P/L %", kind: "number", align: "right" },
];

// HoldingsTablePreview renders a sortable dense financial table for parsed holdings.
export function HoldingsTablePreview({ holdings }: { holdings: HoldingPreview[] }) {
  const router = useRouter();
  const [sortState, setSortState] = useState<SortState>({ key: "marketValue", direction: "desc" });
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const quoteHealth = useMemo(() => buildQuoteHealthSummary(holdings), [holdings]);
  const sortedHoldings = useMemo(
    () => sortHoldings(holdings, sortState),
    [holdings, sortState],
  );

  // refreshTickerPrice updates one cached FMP quote, then refreshes server-rendered dashboard values.
  async function refreshTickerPrice(ticker: string) {
    setRefreshingTicker(ticker);
    setRefreshError(null);

    try {
      const response = await fetch(`/api/market/refresh-quote/${encodeURIComponent(ticker)}`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to refresh ${ticker}.`);
      }

      setConfirmTicker(null);
      router.refresh();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : `Unable to refresh ${ticker}.`);
    } finally {
      setRefreshingTicker(null);
    }
  }

  return (
    <section className="rounded-xl border bg-card/90 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <h2 className="text-base font-semibold">Holdings</h2>
          <p className="text-xs text-muted-foreground">Cost basis, weighting, and current value</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase text-muted-foreground">Quote health</span>
            <QuoteHealthPill label="Fresh" status="fresh" value={quoteHealth.fresh + quoteHealth.good} />
            <QuoteHealthPill label="Aging" status="aging" value={quoteHealth.aging} />
            <QuoteHealthPill label="Stale" status="stale" value={quoteHealth.stale} />
            <QuoteHealthPill label="Fallback" status="fallback" value={quoteHealth.fallback} />
          </div>
          {refreshError ? <p className="mt-1 max-w-xl text-xs text-amber-200">{refreshError}</p> : null}
        </div>
        <span className="font-mono text-xs text-muted-foreground">{holdings.length} assets</span>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {sortedHoldings.map((holding) => (
          <HoldingMobileCard
            confirmTicker={confirmTicker}
            key={holding.ticker}
            holding={holding}
            onCancelRefresh={() => setConfirmTicker(null)}
            onConfirmRefresh={refreshTickerPrice}
            onRequestRefresh={() => setConfirmTicker(holding.ticker)}
            refreshingTicker={refreshingTicker}
          />
        ))}
      </div>
      <div className="hidden md:block">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-secondary/90 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-3 py-2 font-medium", column.align === "right" ? "text-right" : "text-left")}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
                      column.align === "right" && "justify-end",
                    )}
                    aria-label={`Sort holdings by ${column.label}`}
                    onClick={() => setSortState(getNextSortState(sortState, column.key))}
                  >
                    {column.label}
                    <SortIcon isActive={sortState.key === column.key} direction={sortState.direction} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding) => (
              <tr key={holding.ticker} className="border-t transition-colors hover:bg-secondary/45">
                <td className="px-3 py-2 font-semibold">{holding.ticker}</td>
                <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">{holding.name}</td>
                <td className="px-3 py-2 text-right font-mono">{holding.shares}</td>
                <td className="px-3 py-2 text-right font-mono">{holding.weight}</td>
                <td className="px-3 py-2 text-right font-mono">{holding.averagePrice}</td>
                <td className="px-3 py-2 text-right font-mono">{holding.totalCost}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <PriceRefreshButton
                    freshness={holding.quoteFreshness}
                    isConfirming={confirmTicker === holding.ticker}
                    onCancel={() => setConfirmTicker(null)}
                    onConfirm={() => refreshTickerPrice(holding.ticker)}
                    onRequestConfirm={() => setConfirmTicker(holding.ticker)}
                    value={holding.currentPrice}
                    isRefreshing={refreshingTicker === holding.ticker}
                    ticker={holding.ticker}
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono">{holding.marketValue}</td>
                <td className={cn("px-3 py-2 text-right font-mono", holding.profitLoss.startsWith("-") ? "text-rose-300" : "text-emerald-300")}>{holding.profitLoss}</td>
                <td className={cn("px-3 py-2 text-right font-mono", holding.profitLossPercent.startsWith("-") ? "text-rose-300" : "text-emerald-300")}>{holding.profitLossPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// HoldingMobileCard renders one holding as stacked data for narrow screens.
function HoldingMobileCard({
  confirmTicker,
  holding,
  onCancelRefresh,
  onConfirmRefresh,
  onRequestRefresh,
  refreshingTicker,
}: {
  confirmTicker: string | null;
  holding: HoldingPreview;
  onCancelRefresh: () => void;
  onConfirmRefresh: (ticker: string) => void;
  onRequestRefresh: () => void;
  refreshingTicker: string | null;
}) {
  return (
    <article className="rounded-xl border bg-[#191929] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-primary">{holding.ticker}</p>
          <p className="truncate text-xs text-muted-foreground">{holding.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground">Market Value</p>
          <p className="font-mono text-sm font-semibold">{holding.marketValue}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <HoldingStat label="Shares" value={holding.shares} />
        <HoldingStat label="Weight" value={holding.weight} />
        <HoldingStat label="Avg Paid" value={holding.averagePrice} />
        <HoldingStat
          freshness={holding.quoteFreshness}
          isConfirming={confirmTicker === holding.ticker}
          isRefreshing={refreshingTicker === holding.ticker}
          label="Price"
          onCancelRefresh={onCancelRefresh}
          onConfirmRefresh={() => onConfirmRefresh(holding.ticker)}
          onRequestRefresh={onRequestRefresh}
          ticker={holding.ticker}
          value={holding.currentPrice}
        />
        <HoldingStat label="Total Cost" value={holding.totalCost} />
        <HoldingStat label="P/L" value={`${holding.profitLoss} (${holding.profitLossPercent})`} tone={holding.profitLoss.startsWith("-") ? "negative" : "positive"} />
      </div>
    </article>
  );
}

// HoldingStat renders one mobile holding metric with optional gain/loss tone.
function HoldingStat({
  freshness,
  isConfirming = false,
  isRefreshing = false,
  label,
  onCancelRefresh,
  onConfirmRefresh,
  onRequestRefresh,
  ticker,
  tone,
  value,
}: {
  freshness?: QuoteFreshnessMeta;
  isConfirming?: boolean;
  isRefreshing?: boolean;
  label: string;
  onCancelRefresh?: () => void;
  onConfirmRefresh?: () => void;
  onRequestRefresh?: () => void;
  ticker?: string;
  tone?: "positive" | "negative";
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary/45 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
      {onRequestRefresh && onConfirmRefresh && onCancelRefresh && ticker && freshness ? (
        <PriceRefreshButton
          freshness={freshness}
          isConfirming={isConfirming}
          isRefreshing={isRefreshing}
          onCancel={onCancelRefresh}
          onConfirm={onConfirmRefresh}
          onRequestConfirm={onRequestRefresh}
          ticker={ticker}
          value={value}
        />
      ) : (
        <p className={cn("truncate font-mono text-xs font-semibold", tone === "positive" && "text-emerald-300", tone === "negative" && "text-rose-300")}>{value}</p>
      )}
    </div>
  );
}

// PriceRefreshButton renders a compact FMP-only quote refresh affordance for one holding.
function PriceRefreshButton({
  freshness,
  isConfirming,
  isRefreshing,
  onCancel,
  onConfirm,
  onRequestConfirm,
  ticker,
  value,
}: {
  freshness: QuoteFreshnessMeta;
  isConfirming: boolean;
  isRefreshing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onRequestConfirm: () => void;
  ticker: string;
  value: string;
}) {
  const freshnessDescription = getFreshnessDescription(freshness);

  return (
    <span className="group/price relative inline-flex max-w-full justify-end">
      <button
        className={cn(
          "inline-flex max-w-full items-center justify-end gap-1 rounded-lg px-1.5 py-0.5 font-mono text-xs font-semibold text-primary outline-none transition-all hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60",
          freshnessRingClass(freshness.status),
        )}
        disabled={isRefreshing}
        onClick={onRequestConfirm}
        type="button"
        aria-label={`${ticker} price freshness: ${freshnessDescription}. Click to confirm FMP refresh.`}
        title={`${ticker} price freshness: ${freshnessDescription}`}
      >
        <span className="truncate">{value}</span>
        {isRefreshing ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3 opacity-70" aria-hidden="true" />}
      </button>
      {isConfirming ? (
        <span className="absolute right-0 top-[calc(100%+0.4rem)] z-40 flex min-w-40 items-center justify-between gap-2 rounded-xl border border-primary/25 bg-[#171727] px-2 py-2 text-xs shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <span className="text-left leading-tight text-muted-foreground">
            Refresh <span className="font-mono font-semibold text-foreground">{ticker}</span> through FMP?
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              aria-label={`Cancel ${ticker} price refresh`}
              className="rounded-full border border-border/70 p-1 text-muted-foreground transition-colors hover:border-rose-300/50 hover:bg-rose-300/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={onCancel}
              type="button"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
            <button
              aria-label={`Confirm ${ticker} price refresh`}
              className="rounded-full border border-emerald-300/40 bg-emerald-300/10 p-1 text-emerald-200 transition-colors hover:bg-emerald-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={onConfirm}
              type="button"
            >
              <Check className="size-3" aria-hidden="true" />
            </button>
          </span>
        </span>
      ) : (
        <span className="pointer-events-none absolute right-0 top-[calc(100%+0.4rem)] z-30 hidden min-w-52 rounded-xl border border-border/80 bg-[#171727] p-3 text-left text-xs shadow-[0_16px_40px_rgba(0,0,0,0.35)] group-hover/price:block group-focus-within/price:block">
          <span className="block font-semibold text-foreground">{ticker} quote health</span>
          <span className="mt-1 block text-muted-foreground">{freshnessDescription}</span>
          <span className="mt-2 grid gap-1 font-mono text-[11px] text-muted-foreground">
            <span>Status: {formatFreshnessStatus(freshness.status)}</span>
            <span>Source: {formatProviderName(freshness.provider)}</span>
            <span>Fetched: {formatTimestamp(freshness.fetchedAt)}</span>
            <span>Expires: {formatTimestamp(freshness.expiresAt)}</span>
            <span>Age: {formatAge(freshness.ageMs)}</span>
          </span>
        </span>
      )}
    </span>
  );
}

// QuoteHealthPill renders the compact holdings-header summary for cached quote freshness.
function QuoteHealthPill({
  label,
  status,
  value,
}: {
  label: string;
  status: QuoteFreshnessStatus;
  value: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-normal", quoteHealthPillClass(status))}>
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </span>
  );
}

// buildQuoteHealthSummary counts cached quote status buckets for the holdings header.
function buildQuoteHealthSummary(holdings: HoldingPreview[]) {
  return holdings.reduce<Record<QuoteFreshnessStatus, number>>(
    (summary, holding) => {
      summary[holding.quoteFreshness.status] += 1;
      return summary;
    },
    { aging: 0, fallback: 0, fresh: 0, good: 0, stale: 0 },
  );
}

// freshnessRingClass maps quote age buckets to subtle rings around price values.
function freshnessRingClass(status: QuoteFreshnessStatus) {
  if (status === "fresh") {
    return "ring-1 ring-cyan-300/60 shadow-[0_0_12px_rgba(56,213,255,0.16)]";
  }

  if (status === "good") {
    return "ring-1 ring-emerald-300/45 shadow-[0_0_10px_rgba(52,211,153,0.12)]";
  }

  if (status === "aging") {
    return "ring-1 ring-amber-300/45 shadow-[0_0_10px_rgba(252,211,77,0.10)]";
  }

  if (status === "stale") {
    return "ring-1 ring-rose-300/50 shadow-[0_0_10px_rgba(251,113,133,0.12)]";
  }

  return "ring-1 ring-slate-400/30";
}

// quoteHealthPillClass keeps the summary pills visually tied to the price freshness rings.
function quoteHealthPillClass(status: QuoteFreshnessStatus) {
  if (status === "fresh") {
    return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
  }

  if (status === "aging") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (status === "stale") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (status === "fallback") {
    return "border-slate-400/25 bg-slate-400/10 text-slate-200";
  }

  return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
}

// getFreshnessDescription turns technical cache status into plain language for the popout.
function getFreshnessDescription(freshness: QuoteFreshnessMeta) {
  if (freshness.status === "fallback") {
    return "Using the latest CSV transaction price because no provider quote is cached yet.";
  }

  if (freshness.status === "fresh") {
    return `Fresh cached provider quote from ${formatProviderName(freshness.provider)}.`;
  }

  if (freshness.status === "good") {
    return `Recent cached provider quote from ${formatProviderName(freshness.provider)}.`;
  }

  if (freshness.status === "aging") {
    return `Quote is nearing 12 hours old and may be drifting from current market price.`;
  }

  return `Quote is more than 12 hours old. Confirm refresh to request a new FMP quote.`;
}

// formatFreshnessStatus gives the tooltip a direct status line without exposing internal enum names.
function formatFreshnessStatus(status: QuoteFreshnessStatus) {
  if (status === "fresh") {
    return "Fresh";
  }

  if (status === "good") {
    return "Recent";
  }

  if (status === "aging") {
    return "Aging";
  }

  if (status === "stale") {
    return "Stale";
  }

  return "CSV fallback";
}

// formatProviderName keeps provider labels short and readable in quote popouts.
function formatProviderName(provider: string) {
  if (provider === "fmp") {
    return "FMP";
  }

  if (provider === "twelve-data") {
    return "Twelve Data";
  }

  return provider;
}

// formatTimestamp converts cache timestamps into a compact local date/time label.
function formatTimestamp(value: string | null) {
  if (!value) {
    return "CSV fallback";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

// formatAge converts quote age milliseconds into a human-readable cache age.
function formatAge(ageMs: number | null) {
  if (ageMs === null) {
    return "Not cached";
  }

  const minutes = Math.round(ageMs / (1000 * 60));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = minutes / 60;

  if (hours < 48) {
    return `${hours.toFixed(1)}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

// SortIcon shows whether a column is unsorted, ascending, or descending.
function SortIcon({ isActive, direction }: { isActive: boolean; direction: SortState["direction"] }) {
  if (!isActive) {
    return <ArrowUpDown className="size-3 opacity-45" aria-hidden="true" />;
  }

  if (direction === "asc") {
    return <ArrowUp className="size-3 text-primary" aria-hidden="true" />;
  }

  return <ArrowDown className="size-3 text-primary" aria-hidden="true" />;
}

// getNextSortState toggles direction when the same column is clicked.
function getNextSortState(currentSort: SortState, key: SortKey): SortState {
  if (currentSort.key !== key) {
    return { key, direction: "asc" };
  }

  return {
    key,
    direction: currentSort.direction === "asc" ? "desc" : "asc",
  };
}

// sortHoldings creates a stable sorted copy without mutating incoming props.
function sortHoldings(holdings: HoldingPreview[], sortState: SortState) {
  const column = columns.find((candidate) => candidate.key === sortState.key);

  return holdings
    .map((holding, index) => ({ holding, index }))
    .sort((left, right) => {
      const comparison = compareHoldings(left.holding, right.holding, sortState.key, column?.kind ?? "text");

      if (comparison === 0) {
        return left.index - right.index;
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    })
    .map(({ holding }) => holding);
}

// compareHoldings compares either formatted financial numbers or text fields.
function compareHoldings(left: HoldingPreview, right: HoldingPreview, key: SortKey, kind: ColumnDefinition["kind"]) {
  if (kind === "number") {
    return parseFormattedNumber(left[key]) - parseFormattedNumber(right[key]);
  }

  return left[key].localeCompare(right[key], undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

// parseFormattedNumber turns strings like "$1,234.50", "+12.3%", and "(4.00)" into sortable numbers.
function parseFormattedNumber(value: string) {
  const isNegative = value.trim().startsWith("-") || (value.includes("(") && value.includes(")"));
  const numericValue = Number.parseFloat(value.replace(/[$,%+()]/g, "").replace(/,/g, ""));

  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return isNegative ? -numericValue : numericValue;
}
