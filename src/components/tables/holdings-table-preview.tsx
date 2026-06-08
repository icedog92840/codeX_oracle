"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw } from "lucide-react";
import type { HoldingPreview } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// SortKey lists every sortable holdings table column.
type SortKey = keyof HoldingPreview;

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
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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

      router.refresh();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : `Unable to refresh ${ticker}.`);
    } finally {
      setRefreshingTicker(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card/90 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <h2 className="text-base font-semibold">Holdings</h2>
          <p className="text-xs text-muted-foreground">Cost basis, weighting, and current value</p>
          {refreshError ? <p className="mt-1 max-w-xl text-xs text-amber-200">{refreshError}</p> : null}
        </div>
        <span className="font-mono text-xs text-muted-foreground">{holdings.length} assets</span>
      </div>
      <div className="grid gap-2 p-3 md:hidden">
        {sortedHoldings.map((holding) => (
          <HoldingMobileCard key={holding.ticker} holding={holding} onRefreshPrice={refreshTickerPrice} refreshingTicker={refreshingTicker} />
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
                    onRefresh={() => refreshTickerPrice(holding.ticker)}
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
  holding,
  onRefreshPrice,
  refreshingTicker,
}: {
  holding: HoldingPreview;
  onRefreshPrice: (ticker: string) => void;
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
        <HoldingStat label="Price" value={holding.currentPrice} onRefresh={() => onRefreshPrice(holding.ticker)} isRefreshing={refreshingTicker === holding.ticker} ticker={holding.ticker} />
        <HoldingStat label="Total Cost" value={holding.totalCost} />
        <HoldingStat label="P/L" value={`${holding.profitLoss} (${holding.profitLossPercent})`} tone={holding.profitLoss.startsWith("-") ? "negative" : "positive"} />
      </div>
    </article>
  );
}

// HoldingStat renders one mobile holding metric with optional gain/loss tone.
function HoldingStat({
  isRefreshing = false,
  label,
  onRefresh,
  ticker,
  tone,
  value,
}: {
  isRefreshing?: boolean;
  label: string;
  onRefresh?: () => void;
  ticker?: string;
  tone?: "positive" | "negative";
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary/45 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
      {onRefresh && ticker ? (
        <PriceRefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} ticker={ticker} value={value} />
      ) : (
        <p className={cn("truncate font-mono text-xs font-semibold", tone === "positive" && "text-emerald-300", tone === "negative" && "text-rose-300")}>{value}</p>
      )}
    </div>
  );
}

// PriceRefreshButton renders a compact FMP-only quote refresh affordance for one holding.
function PriceRefreshButton({
  isRefreshing,
  onRefresh,
  ticker,
  value,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  ticker: string;
  value: string;
}) {
  return (
    <button
      className="inline-flex max-w-full items-center justify-end gap-1 rounded-lg px-1 py-0.5 font-mono text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isRefreshing}
      onClick={onRefresh}
      type="button"
      aria-label={`Refresh ${ticker} price through FMP`}
      title={`Refresh ${ticker} price through FMP`}
    >
      <span className="truncate">{value}</span>
      {isRefreshing ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3 opacity-70" aria-hidden="true" />}
    </button>
  );
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
