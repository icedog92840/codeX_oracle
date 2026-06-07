"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bookmark, BookmarkCheck, Loader2, RotateCcw, Search, Trash2, X } from "lucide-react";
import { getAnalyzerDataProvider } from "@/lib/analyzer/analyzer-data-resolver";
import { buildAnalyzerScan } from "@/lib/analyzer/technical-score";
import type { AnalyzerScan, OhlcCandle, WatchlistItem } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";

// LoadingMessages are displayed one at a time while the analyzer simulates the local scan pipeline.
const loadingMessages = [
  "Input received...",
  "Fetching historical price matrix...",
  "Running technical algorithms...",
  "Calculating support and resistance zones...",
  "Generating technical grade...",
];

// StorageKeys isolate browser localStorage names used as a fast fallback beside SQLite persistence.
const storageKeys = {
  recentScans: "codex-oracle.analyzer.recent-scans",
  watchlist: "codex-oracle.analyzer.watchlist",
};

// StockAnalyzer renders the full local stock analyzer workflow.
export function StockAnalyzer() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [scan, setScan] = useState<AnalyzerScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<AnalyzerScan[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const isSaved = scan ? watchlist.some((item) => item.ticker === scan.ticker) : false;

  useEffect(() => {
    window.queueMicrotask(() => {
      setRecentScans(readStoredArray<AnalyzerScan>(storageKeys.recentScans));
      setWatchlist(readStoredWatchlist());
      void hydrateDatabaseWatchlist(setWatchlist);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingIndex((currentIndex) => (currentIndex + 1) % loadingMessages.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  // handleAnalyze validates input, runs the local provider, and stores the completed scan.
  async function handleAnalyze(event?: FormEvent<HTMLFormElement>, tickerOverride?: string) {
    event?.preventDefault();
    const ticker = normalizeTicker(tickerOverride ?? tickerInput);

    if (!ticker) {
      setError("Enter a ticker symbol to run a local scan.");
      setScan(null);
      return;
    }

    setTickerInput(ticker);
    setError(null);
    setScan(null);
    setLoadingIndex(0);
    setIsLoading(true);

    try {
      const payload = await getAnalyzerDataProvider().getAnalyzerPayload(ticker);
      const result = buildAnalyzerScan({
        ticker: payload.profile.ticker,
        companyName: payload.profile.companyName,
        dividendYield: payload.profile.dividendYield,
        source: payload.source,
        candles: payload.candles,
      });

      await wait(loadingMessages.length * 1200);
      setScan(result);
      setRecentScans((currentScans) => storeRecentScans([result, ...currentScans]));
      setWatchlist((currentWatchlist) => refreshWatchlistScan(currentWatchlist, result));
      void persistAnalyzerScan(result);
    } catch {
      setError("The analyzer data provider could not return an OHLC payload for that ticker.");
    } finally {
      setIsLoading(false);
    }
  }

  // toggleWatchlist adds or removes the current scan from the local browser watchlist.
  function toggleWatchlist() {
    if (!scan) {
      return;
    }

    setWatchlist((currentWatchlist) => {
      const alreadySaved = currentWatchlist.some((item) => item.ticker === scan.ticker);
      const savedItem = buildWatchlistItemFromScan(scan);
      const nextWatchlist = alreadySaved
        ? currentWatchlist.filter((item) => item.ticker !== scan.ticker)
        : [
            {
              ...savedItem,
            },
            ...currentWatchlist,
          ];

      window.localStorage.setItem(storageKeys.watchlist, JSON.stringify(nextWatchlist));
      void (alreadySaved ? deletePersistedWatchlistItem(scan.ticker) : persistWatchlistItem(savedItem));
      return nextWatchlist;
    });
  }

  // removeWatchlistItem deletes one saved ticker without clearing recent scan history.
  function removeWatchlistItem(ticker: string) {
    setWatchlist((currentWatchlist) => {
      const nextWatchlist = currentWatchlist.filter((item) => item.ticker !== ticker);

      window.localStorage.setItem(storageKeys.watchlist, JSON.stringify(nextWatchlist));
      void deletePersistedWatchlistItem(ticker);
      return nextWatchlist;
    });
  }

  // clearRecentScans removes locally stored scan history while leaving the active result visible.
  function clearRecentScans() {
    setRecentScans([]);
    window.localStorage.removeItem(storageKeys.recentScans);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
        <form className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto]" onSubmit={handleAnalyze}>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border bg-[#191929] px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Stock ticker</span>
            <input
              className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground"
              disabled={isLoading}
              onChange={(event) => setTickerInput(event.target.value)}
              placeholder="Enter ticker"
              value={tickerInput}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_22px_rgba(56,213,255,0.20)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Analyze
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Mock OHLC data only. No live market feed is connected yet.</p>
      </section>

      {error ? <ErrorPanel message={error} /> : null}
      {isLoading ? <LoadingPanel loadingIndex={loadingIndex} /> : null}
      {!isLoading && !scan && !error ? <IdlePanel /> : null}
      {!isLoading && scan ? <ResultPanel isSaved={isSaved} onToggleWatchlist={toggleWatchlist} scan={scan} /> : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <RecentScansPanel onAnalyze={handleAnalyze} onClear={clearRecentScans} recentScans={recentScans} />
        <WatchlistPanel onAnalyze={handleAnalyze} onRemove={removeWatchlistItem} watchlist={watchlist} />
      </div>
    </div>
  );
}

// LoadingPanel renders the animated progress bar and rotating analysis status text.
function LoadingPanel({ loadingIndex }: { loadingIndex: number }) {
  const progress = ((loadingIndex + 1) / loadingMessages.length) * 100;

  return (
    <section className="rounded-xl border bg-card/90 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="h-2 overflow-hidden rounded-full bg-[#191929]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#38d5ff,#7c3aed)] transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 font-mono text-sm text-primary">{loadingMessages[loadingIndex]}</p>
    </section>
  );
}

// IdlePanel explains the analyzer's empty state before the first scan.
function IdlePanel() {
  return (
    <section className="rounded-xl border bg-card/90 p-4 text-sm text-muted-foreground shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      Run a local technical scan to see trend, momentum, support/resistance, and a transparent model score.
    </section>
  );
}

// ErrorPanel renders analyzer validation and provider errors.
function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200">
      <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
      <p>{message}</p>
    </section>
  );
}

// ResultPanel renders the completed analyzer snapshot and related action controls.
function ResultPanel({
  isSaved,
  onToggleWatchlist,
  scan,
}: {
  isSaved: boolean;
  onToggleWatchlist: () => void;
  scan: AnalyzerScan;
}) {
  return (
    <div className="space-y-3">
      <section className="grid gap-3 rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)] xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{scan.companyName}</h2>
              <p className="font-mono text-sm text-primary">{scan.ticker}</p>
            </div>
            <span className="rounded-xl border bg-[#191929] px-3 py-1.5 font-mono text-xs text-muted-foreground">Mock OHLC</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {scan.signals.map((signal) => (
              <span key={signal} className="rounded-full border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-[#191929] p-3">
          <p className="text-xs uppercase text-muted-foreground">Technical Grade</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-mono text-4xl font-semibold text-primary">{scan.grade}</p>
            <p className="font-mono text-lg font-semibold">{scan.score}/100</p>
          </div>
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:border-primary/60 hover:bg-secondary"
            onClick={onToggleWatchlist}
            type="button"
          >
            {isSaved ? <BookmarkCheck className="size-4 text-primary" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
            {isSaved ? "Saved" : "Add to Watchlist"}
          </button>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PriceChart scan={scan} />
        <TechnicalSummary scan={scan} />
      </div>

      <MetricGrid scan={scan} />
      <ScoreBreakdown scan={scan} />
    </div>
  );
}

// MetricGrid renders the analyzer's core technical indicator cards.
function MetricGrid({ scan }: { scan: AnalyzerScan }) {
  const metrics = [
    { label: "Stock Price", value: formatCurrency(scan.price) },
    { label: "Dividend Yield", value: formatPercent(scan.dividendYield) },
    { label: "Support", value: formatCurrency(scan.support20), detail: "20-day low" },
    { label: "Resistance", value: formatCurrency(scan.resistance20), detail: "20-day high" },
    { label: "RSI 14", value: scan.rsi14.toFixed(1) },
    { label: "MACD", value: scan.macd.toFixed(2), detail: `Signal ${scan.macdSignal.toFixed(2)}` },
    { label: "50-day SMA", value: formatCurrency(scan.sma50) },
    { label: "200-day SMA", value: formatCurrency(scan.sma200) },
    { label: "Score", value: String(scan.score), detail: "0-100" },
    { label: "Grade", value: scan.grade },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
          <p className="text-xs uppercase text-muted-foreground">{metric.label}</p>
          <p className="mt-2 truncate font-mono text-lg font-semibold">{metric.value}</p>
          {metric.detail ? <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p> : null}
        </div>
      ))}
    </section>
  );
}

// PriceChart renders a compact 60-day close line with support and resistance bands.
function PriceChart({ scan }: { scan: AnalyzerScan }) {
  const chart = useMemo(() => buildChartGeometry(scan.candles.slice(-60), scan.support20, scan.resistance20), [scan]);

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Price Setup</h3>
          <p className="text-xs text-muted-foreground">60-day close with support and resistance</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{formatCurrency(scan.price)}</p>
      </div>
      <svg className="h-64 w-full overflow-visible" viewBox="0 0 720 260" role="img" aria-label={`${scan.ticker} mock price chart`}>
        <line x1="48" x2="700" y1={chart.supportY} y2={chart.supportY} stroke="#25e0bf" strokeDasharray="5 6" opacity="0.6" />
        <line x1="48" x2="700" y1={chart.resistanceY} y2={chart.resistanceY} stroke="#bd1dff" strokeDasharray="5 6" opacity="0.6" />
        {chart.grid.map((line) => (
          <g key={line.label}>
            <line x1="48" x2="700" y1={line.y} y2={line.y} stroke="#38384d" strokeDasharray="4 6" />
            <text x="0" y={line.y + 4} className="fill-muted-foreground font-mono text-[10px]">{line.label}</text>
          </g>
        ))}
        <path d={chart.path} fill="none" stroke="#38d5ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {chart.points.map((point, index) => (
          <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r={index === chart.points.length - 1 ? 4 : 0} className="fill-primary" />
        ))}
        <text x="612" y={chart.supportY - 7} className="fill-emerald-300 font-mono text-[10px]">support</text>
        <text x="592" y={chart.resistanceY - 7} className="fill-violet-300 font-mono text-[10px]">resistance</text>
      </svg>
    </section>
  );
}

// TechnicalSummary renders the generated narrative paragraph.
function TechnicalSummary({ scan }: { scan: AnalyzerScan }) {
  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <h3 className="text-base font-semibold">Technical Summary</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{scan.summary}</p>
      <p className="mt-3 rounded-xl border bg-[#191929] p-3 text-xs text-muted-foreground">
        This is a local technical setup model using mock OHLC data. It is not a buy or sell recommendation.
      </p>
    </section>
  );
}

// ScoreBreakdown renders the points that feed the final technical score.
function ScoreBreakdown({ scan }: { scan: AnalyzerScan }) {
  const buckets = [
    { label: "Trend", value: scan.scoreBreakdown.trend, max: 40 },
    { label: "Momentum", value: scan.scoreBreakdown.momentum, max: 25 },
    { label: "Support", value: scan.scoreBreakdown.support, max: 20 },
    { label: "MACD", value: scan.scoreBreakdown.macd, max: 15 },
  ];

  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <h3 className="text-base font-semibold">Score Breakdown</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-xl border bg-[#191929] p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="font-mono font-semibold">{bucket.value}/{bucket.max}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#38d5ff,#7c3aed)]" style={{ width: `${(bucket.value / bucket.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// RecentScansPanel shows the automatic local scan history.
function RecentScansPanel({
  onAnalyze,
  onClear,
  recentScans,
}: {
  onAnalyze: (event?: FormEvent<HTMLFormElement>, tickerOverride?: string) => void;
  onClear: () => void;
  recentScans: AnalyzerScan[];
}) {
  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Recent Scans</h3>
          <p className="text-xs text-muted-foreground">Saved locally with browser fallback</p>
        </div>
        <button className="rounded-xl border p-2 text-muted-foreground transition-colors hover:text-foreground" onClick={onClear} type="button" aria-label="Clear recent scans">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {recentScans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          recentScans.slice(0, 8).map((item) => (
            <button
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-[#191929] px-3 py-2 text-left transition-colors hover:border-primary/60"
              onClick={() => onAnalyze(undefined, item.ticker)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-sm font-semibold text-primary">{item.ticker}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.companyName}</span>
              </span>
              <span className="text-right font-mono text-xs">
                <span className="block text-foreground">{item.grade} · {item.score}</span>
                <span className="text-muted-foreground">{formatShortDate(item.scannedAt)}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

// WatchlistPanel shows manually saved tickers for repeat scans.
function WatchlistPanel({
  onAnalyze,
  onRemove,
  watchlist,
}: {
  onAnalyze: (event?: FormEvent<HTMLFormElement>, tickerOverride?: string) => void;
  onRemove: (ticker: string) => void;
  watchlist: WatchlistItem[];
}) {
  return (
    <section className="rounded-xl border bg-card/90 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.20)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Watchlist</h3>
          <p className="text-xs text-muted-foreground">Saved scan snapshots in local SQLite</p>
        </div>
        <span className="rounded-full border bg-[#191929] px-2 py-1 font-mono text-[10px] text-muted-foreground">{watchlist.length} saved</span>
      </div>
      <div className="mt-3 grid gap-2">
        {watchlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">Save a scan to start a local watchlist with score, grade, price, yield, and last scan date.</p>
        ) : (
          watchlist.map((item) => (
            <article
              key={item.ticker}
              className="rounded-xl border bg-[#191929] p-3 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-primary">{item.ticker}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.companyName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="rounded-xl border p-2 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                    onClick={() => onAnalyze(undefined, item.ticker)}
                    type="button"
                    aria-label={`Re-scan ${item.ticker}`}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    className="rounded-xl border p-2 text-muted-foreground transition-colors hover:border-rose-400/60 hover:text-rose-200"
                    onClick={() => onRemove(item.ticker)}
                    type="button"
                    aria-label={`Remove ${item.ticker} from watchlist`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <WatchlistMetric label="Grade" value={`${item.grade} / ${item.score}`} accent />
                <WatchlistMetric label="Price" value={formatCurrency(item.price)} />
                <WatchlistMetric label="Yield" value={formatPercent(item.dividendYield)} />
                <WatchlistMetric label="Scanned" value={formatShortDate(item.lastScannedAt)} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

// WatchlistMetric renders one compact saved-scan field inside a watchlist card.
function WatchlistMetric({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-secondary/40 px-2 py-1.5">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-xs font-semibold", accent ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

// buildChartGeometry converts close prices into SVG points, path, and grid labels.
function buildChartGeometry(candles: OhlcCandle[], support: number, resistance: number) {
  const values = candles.flatMap((candle) => [candle.close, support, resistance]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const left = 48;
  const right = 700;
  const top = 24;
  const bottom = 224;
  const points = candles.map((candle, index) => ({
    x: candles.length <= 1 ? left : left + (index / (candles.length - 1)) * (right - left),
    y: bottom - ((candle.close - min) / spread) * (bottom - top),
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const valueToY = (value: number) => bottom - ((value - min) / spread) * (bottom - top);

  return {
    points,
    path,
    supportY: valueToY(support),
    resistanceY: valueToY(resistance),
    grid: Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const value = max - (max - min) * ratio;

      return {
        y: top + ratio * (bottom - top),
        label: formatCompactCurrency(value),
      };
    }),
  };
}

// storeRecentScans deduplicates by ticker and keeps the newest ten scans.
function storeRecentScans(scans: AnalyzerScan[]) {
  const seenTickers = new Set<string>();
  const nextScans = scans
    .filter((scan) => {
      if (seenTickers.has(scan.ticker)) {
        return false;
      }

      seenTickers.add(scan.ticker);
      return true;
    })
    .slice(0, 10);

  window.localStorage.setItem(storageKeys.recentScans, JSON.stringify(nextScans));
  return nextScans;
}

// hydrateDatabaseWatchlist merges SQLite-backed saved tickers into the browser watchlist state.
async function hydrateDatabaseWatchlist(setWatchlist: (updater: (currentWatchlist: WatchlistItem[]) => WatchlistItem[]) => void) {
  try {
    const response = await fetch("/api/watchlist");

    if (!response.ok) {
      return;
    }

    const payload = await response.json() as { items?: WatchlistItem[] };
    const databaseItems = Array.isArray(payload.items) ? payload.items : [];

    if (databaseItems.length === 0) {
      return;
    }

    setWatchlist((currentWatchlist) => {
      const merged = mergeWatchlistItems(currentWatchlist, databaseItems);
      window.localStorage.setItem(storageKeys.watchlist, JSON.stringify(merged));
      return merged;
    });
  } catch {
    return;
  }
}

// persistAnalyzerScan mirrors one completed scan into SQLite without blocking the UI.
async function persistAnalyzerScan(scan: AnalyzerScan) {
  try {
    await fetch("/api/analyzer/scans", {
      body: JSON.stringify({ scan }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    return;
  }
}

// persistWatchlistItem mirrors one saved watchlist row into SQLite.
async function persistWatchlistItem(item: WatchlistItem) {
  try {
    await fetch("/api/watchlist", {
      body: JSON.stringify({
        companyName: item.companyName,
        latestScanId: item.latestScanId,
        ticker: item.ticker,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    return;
  }
}

// deletePersistedWatchlistItem mirrors watchlist removal into SQLite.
async function deletePersistedWatchlistItem(ticker: string) {
  try {
    await fetch("/api/watchlist", {
      body: JSON.stringify({ ticker }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
  } catch {
    return;
  }
}

// mergeWatchlistItems combines database and browser watchlists by ticker, preferring newest scan dates.
function mergeWatchlistItems(browserItems: WatchlistItem[], databaseItems: WatchlistItem[]) {
  const itemsByTicker = new Map<string, WatchlistItem>();

  [...databaseItems, ...browserItems].forEach((item) => {
    const existingItem = itemsByTicker.get(item.ticker);

    if (!existingItem || new Date(item.lastScannedAt).getTime() > new Date(existingItem.lastScannedAt).getTime()) {
      itemsByTicker.set(item.ticker, item);
    }
  });

  return Array.from(itemsByTicker.values()).sort((left, right) => new Date(right.lastScannedAt).getTime() - new Date(left.lastScannedAt).getTime());
}

// refreshWatchlistScan updates a saved ticker with the newest scan while leaving unsaved tickers alone.
function refreshWatchlistScan(watchlist: WatchlistItem[], scan: AnalyzerScan) {
  if (!watchlist.some((item) => item.ticker === scan.ticker)) {
    return watchlist;
  }

  const nextWatchlist = watchlist.map((item) => (item.ticker === scan.ticker ? buildWatchlistItemFromScan(scan, item) : item));

  window.localStorage.setItem(storageKeys.watchlist, JSON.stringify(nextWatchlist));
  void persistWatchlistItem(buildWatchlistItemFromScan(scan, watchlist.find((item) => item.ticker === scan.ticker)));
  return nextWatchlist;
}

// buildWatchlistItemFromScan keeps the saved watchlist row small but useful for comparison.
function buildWatchlistItemFromScan(scan: AnalyzerScan, existingItem?: WatchlistItem): WatchlistItem {
  return {
    ticker: scan.ticker,
    companyName: scan.companyName,
    addedAt: existingItem?.addedAt ?? new Date().toISOString(),
    lastScannedAt: scan.scannedAt,
    latestScanId: scan.id,
    price: scan.price,
    dividendYield: scan.dividendYield,
    score: scan.score,
    grade: scan.grade,
    source: scan.source,
  };
}

// readStoredWatchlist migrates older saved tickers into the richer watchlist snapshot shape.
function readStoredWatchlist() {
  const storedItems = readStoredArray<Partial<WatchlistItem>>(storageKeys.watchlist);
  const migratedItems = storedItems
    .filter((item): item is Partial<WatchlistItem> & { ticker: string } => typeof item.ticker === "string" && item.ticker.length > 0)
    .map((item) => ({
      ticker: item.ticker,
      companyName: item.companyName ?? item.ticker,
      addedAt: item.addedAt ?? new Date().toISOString(),
      lastScannedAt: item.lastScannedAt ?? item.addedAt ?? new Date().toISOString(),
      latestScanId: item.latestScanId ?? `${item.ticker}-legacy`,
      price: typeof item.price === "number" ? item.price : 0,
      dividendYield: typeof item.dividendYield === "number" ? item.dividendYield : 0,
      score: typeof item.score === "number" ? item.score : 0,
      grade: item.grade ?? "F",
      source: item.source ?? "mock",
    }));

  window.localStorage.setItem(storageKeys.watchlist, JSON.stringify(migratedItems));
  return migratedItems;
}

// readStoredArray safely parses one localStorage array.
function readStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : [];
  } catch {
    return [];
  }
}

// normalizeTicker keeps analysis requests consistent and safe.
function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 8);
}

// wait pauses long enough for the staged loading sequence to complete.
function wait(durationMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

// formatCurrency renders analyzer prices with aligned financial formatting.
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
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

// formatPercent renders dividend yield and ratio values.
function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    style: "percent",
  }).format(value);
}

// formatShortDate renders recent scan timestamps without taking much room.
function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
