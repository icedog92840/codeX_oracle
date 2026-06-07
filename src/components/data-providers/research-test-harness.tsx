"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2, RefreshCw, Search } from "lucide-react";
import type { ExternalDataSource, SourceFreshness, StockResearchSnapshot } from "@/lib/external-data/types";
import { cn } from "@/lib/utils";

// ResearchHarnessResult stores success and error payloads returned by the local research route.
type ResearchHarnessResult = {
  error?: string;
  data?: StockResearchSnapshot;
};

// ResearchTestHarness lets provider setup be tested without exposing keys or changing analyzer UI.
export function ResearchTestHarness() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchHarnessResult | null>(null);
  const sourceSummary = useMemo(() => buildSourceSummary(result?.data), [result]);

  // handleSubmit runs a cache-first research lookup for the entered ticker.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadResearch(false);
  }

  // loadResearch calls the server-only research route and optionally bypasses fresh cache.
  async function loadResearch(forceRefresh: boolean) {
    const ticker = normalizeTicker(tickerInput);

    if (!ticker) {
      setResult({ error: "Enter a ticker symbol before testing the research route." });
      return;
    }

    setTickerInput(ticker);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/research/${encodeURIComponent(ticker)}${forceRefresh ? "?refresh=1" : ""}`);
      const payload = await response.json();

      if (!response.ok) {
        setResult({ error: payload.error ?? "Research route returned an error." });
        return;
      }

      setResult({ data: payload as StockResearchSnapshot });
    } catch {
      setResult({ error: "Research route could not be reached. Start the dev server and try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Research Test Harness</h2>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">dev helper</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Test `/api/research/[ticker]` before or after adding provider keys. This checks quote, candles, fundamentals, news, source tags, and cache freshness in one place.
          </p>
        </div>

        <form className="grid min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto]" onSubmit={handleSubmit}>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border bg-[#191929] px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Research ticker</span>
            <input
              className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground"
              disabled={isLoading}
              onChange={(event) => setTickerInput(event.target.value)}
              placeholder="Ticker"
              value={tickerInput}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Test
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void loadResearch(true)}
            type="button"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
        </form>
      </div>

      {result?.error ? <HarnessError message={result.error} /> : null}
      {result?.data ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <ResearchStatusCard label="Quote" source={result.data.quote?.source} value={result.data.quote ? formatCurrency(result.data.quote.price) : "Unavailable"} freshness={result.data.quote?.freshness} />
            <ResearchStatusCard label="OHLC Candles" source={result.data.ohlc?.source} value={result.data.ohlc ? `${result.data.ohlc.candles.length} candles` : "Unavailable"} freshness={result.data.ohlc?.freshness} />
            <ResearchStatusCard label="Fundamentals" source={result.data.fundamentals?.source} value={result.data.fundamentals ? "Available" : "Unavailable"} freshness={result.data.fundamentals?.freshness} />
            <ResearchStatusCard label="News" source={sourceSummary.newsSource} value={`${result.data.news.length} headlines`} freshness={sourceSummary.newsFreshness} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div className="rounded-xl border bg-[#191929] p-3">
              <p className="text-xs font-semibold uppercase text-primary">Research Snapshot</p>
              <div className="mt-3 grid gap-2">
                <SnapshotLine label="Ticker" value={result.data.ticker} />
                <SnapshotLine label="Generated" value={formatDateTime(result.data.generatedAt)} />
                <SnapshotLine label="Mode" value={result.data.refreshed ? "Force refresh" : "Cache first"} />
                <SnapshotLine label="Sources" value={sourceSummary.sources.length ? sourceSummary.sources.map(formatSourceName).join(", ") : "No provider data yet"} />
              </div>
            </div>

            <div className="rounded-xl border bg-[#191929] p-3">
              <p className="text-xs font-semibold uppercase text-primary">What This Means</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Unavailable sections are expected until their matching provider env keys are added and the dev server is restarted. Available sections should show a provider source and cache timestamp.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sourceSummary.sources.length ? sourceSummary.sources.map((source) => <SourcePill key={source} source={source} />) : <span className="rounded-full border border-amber-200/30 px-2 py-1 font-mono text-[10px] text-amber-200">No provider source</span>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// HarnessError renders route failures without crashing the data provider page.
function HarnessError({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

// ResearchStatusCard summarizes one part of the research payload.
function ResearchStatusCard({
  freshness,
  label,
  source,
  value,
}: {
  freshness?: SourceFreshness;
  label: string;
  source?: ExternalDataSource;
  value: string;
}) {
  const isAvailable = Boolean(source);

  return (
    <div className="rounded-xl border bg-[#191929] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase text-muted-foreground">{label}</p>
          <p className={cn("mt-1 truncate font-mono text-sm font-semibold", isAvailable ? "text-primary" : "text-amber-200")}>{value}</p>
        </div>
        {isAvailable ? <CheckCircle2 className="size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <Database className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">{source ? formatSourceName(source) : "Waiting for provider key"}</p>
      {freshness ? (
        <p className={cn("mt-1 text-[10px]", freshness.isStale ? "text-amber-200" : "text-emerald-300")}>
          {freshness.isStale ? "Stale" : "Fresh"} / fetched {formatDateTime(freshness.fetchedAt)}
        </p>
      ) : null}
    </div>
  );
}

// SnapshotLine renders one compact label/value row for the returned research snapshot.
function SnapshotLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-foreground">{value}</span>
    </div>
  );
}

// SourcePill renders one compact provider source tag.
function SourcePill({ source }: { source: ExternalDataSource }) {
  return (
    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">
      {formatSourceName(source)}
    </span>
  );
}

// buildSourceSummary extracts source and freshness labels from a research payload.
function buildSourceSummary(data?: StockResearchSnapshot) {
  const sources = new Set<ExternalDataSource>();

  if (data?.quote?.source) {
    sources.add(data.quote.source);
  }

  if (data?.ohlc?.source) {
    sources.add(data.ohlc.source);
  }

  if (data?.fundamentals?.source) {
    sources.add(data.fundamentals.source);
  }

  data?.news.forEach((item) => sources.add(item.source));

  return {
    newsFreshness: data?.news.find((item) => item.freshness)?.freshness,
    newsSource: data?.news.find((item) => item.source)?.source,
    sources: Array.from(sources),
  };
}

// normalizeTicker keeps harness requests consistent with the research route.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}

// formatCurrency keeps quote values compact inside the harness cards.
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

// formatDateTime keeps cache timestamps readable in dense cards.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

// formatSourceName maps internal provider ids to user-facing labels.
function formatSourceName(value: ExternalDataSource | string) {
  const labels: Record<string, string> = {
    "alpha-vantage": "Alpha Vantage",
    fmp: "FMP",
    "rss-news": "RSS News",
    "sec-edgar": "SEC EDGAR",
    "twelve-data": "Twelve Data",
  };

  return labels[value] ?? value;
}
