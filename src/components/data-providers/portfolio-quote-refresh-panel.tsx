"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// QuoteRefreshResult mirrors the portfolio quote refresh API response.
type QuoteRefreshResult = {
  attempted: number;
  errors: string[];
  generatedAt: string;
  providers: string[];
  refreshed: number;
  skipped: string[];
  tickers: string[];
};

// PortfolioQuoteRefreshPanel triggers a budget-guarded refresh for all open holding quotes.
export function PortfolioQuoteRefreshPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<QuoteRefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // refreshQuotes calls the server route that updates SQLite quote cache for open holdings.
  async function refreshQuotes() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/market/refresh-quotes", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Quote refresh failed.");
      }

      setResult(payload as QuoteRefreshResult);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Quote refresh failed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Portfolio Quote Refresh</h2>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">cache updater</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Refreshes lightweight current prices for every open holding, stores them in SQLite, and lets the dashboard update without deep Analyzer scans.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRefreshing}
          onClick={refreshQuotes}
          type="button"
        >
          {isRefreshing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
          Refresh Portfolio Quotes
        </button>
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <RefreshMetric label="Attempted" value={String(result.attempted)} />
          <RefreshMetric label="Covered" value={String(result.refreshed)} tone="positive" />
          <RefreshMetric label="Providers" value={result.providers.join(", ") || "-"} />
          <RefreshMetric label="Skipped" value={String(result.skipped.length)} tone={result.skipped.length ? "warning" : "positive"} />
          {result.errors.length ? (
            <div className="rounded-xl border border-amber-200/30 bg-[#191929] p-3 md:col-span-4">
              <p className="text-xs font-semibold uppercase text-amber-200">Provider Notes</p>
              <div className="mt-2 grid gap-1">
                {result.errors.slice(0, 4).map((item) => (
                  <p key={item} className="text-xs leading-5 text-muted-foreground">{item}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// RefreshMetric renders one compact quote refresh result counter.
function RefreshMetric({ label, tone = "neutral", value }: { label: string; tone?: "neutral" | "positive" | "warning"; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-[#191929] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 truncate font-mono text-sm font-semibold",
              tone === "neutral" && "text-foreground",
              tone === "positive" && "text-emerald-300",
              tone === "warning" && "text-amber-200",
            )}
          >
            {value}
          </p>
        </div>
        {tone === "positive" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
