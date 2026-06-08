"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Database, Pause, X } from "lucide-react";
import type { BriefingItem, InsightChip, InsightDataStatusItem, InsightRibbonData, InsightRoutePayload } from "@/lib/data/insight-ribbon";
import type { ProviderStatus } from "@/lib/data/provider-status";
import { cn } from "@/lib/utils";

// InsightRibbon replaces the old search placeholder with page-aware local portfolio context.
export function InsightRibbon({ data }: { data: InsightRibbonData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pathname = usePathname();
  const analyzerStorageSnapshot = useSyncExternalStore(subscribeAnalyzerStorage, getAnalyzerStorageSnapshot, getEmptyAnalyzerStorageSnapshot);
  const analyzerSnapshot = useMemo(
    () => (pathname.startsWith("/analyzer") ? readAnalyzerSnapshot(analyzerStorageSnapshot) : null),
    [analyzerStorageSnapshot, pathname],
  );
  const routePayload = useMemo(() => getRoutePayload(pathname, data, analyzerSnapshot), [analyzerSnapshot, data, pathname]);

  return (
    <section
      className={cn(
        "group relative rounded-2xl border bg-card/80 shadow-[0_12px_36px_rgba(0,0,0,0.18)] ring-1 ring-primary/5 backdrop-blur",
        isExpanded || isDataOpen ? "z-50 overflow-visible" : "overflow-hidden",
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="grid w-full gap-2 p-2 text-left md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] md:items-center"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="soft-pulse hidden size-9 shrink-0 items-center justify-center rounded-xl border bg-[#191929] text-primary shadow-[0_0_22px_rgba(56,213,255,0.14)] sm:flex">
            <BarChart3 className="size-4" aria-hidden="true" />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4">
            {routePayload.chips.map((chip) => (
              <InsightChipPill key={`${chip.label}-${chip.value}`} chip={chip} />
            ))}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
          <button
            className="relative min-w-0 overflow-hidden rounded-xl border bg-[#191929]/80 px-3 py-2 text-left outline-none transition-colors hover:border-primary/50 hover:bg-[#202034] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
            onClick={() => {
              setIsDataOpen(false);
              setIsExpanded(true);
            }}
            type="button"
            aria-expanded={isExpanded}
            aria-label="Open full portfolio briefing"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase text-primary">Briefing</span>
              <BriefingMarquee items={routePayload.briefingItems} isPaused={isPaused || isExpanded} />
              {isPaused ? <Pause className="ml-auto hidden size-3 shrink-0 text-muted-foreground md:block" aria-hidden="true" /> : null}
            </div>
          </button>

          <button
            className={cn(
              "soft-pulse inline-flex h-full items-center gap-1.5 rounded-xl border bg-[#191929]/80 px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:bg-[#202034] hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35",
              isDataOpen && "border-primary/60 text-primary",
            )}
            onClick={() => {
              setIsExpanded(false);
              setIsDataOpen((current) => !current);
            }}
            type="button"
            aria-expanded={isDataOpen}
            aria-label="Open data status"
          >
            <Database className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Data</span>
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="absolute inset-x-0 top-0 z-40 rounded-2xl border bg-[#191929]/98 p-3 shadow-[0_22px_60px_rgba(0,0,0,0.48)] ring-1 ring-primary/15 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="soft-pulse mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border bg-secondary text-primary">
              <BarChart3 className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-primary">Briefing</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {routePayload.briefingItems.map((item) => (
                  <BriefingExpandedCard key={`${item.label}-${item.value}`} item={item} />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="rounded-xl border p-2 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                onClick={() => setIsExpanded(false)}
                type="button"
                aria-label="Close full portfolio briefing"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDataOpen ? (
        <DataStatusPanel items={data.dataStatus} onClose={() => setIsDataOpen(false)} providers={data.providerStatus} />
      ) : null}
      <div className="insight-hairline absolute inset-x-0 bottom-0 h-px" />
    </section>
  );
}

// BriefingMarquee renders leaderboard-style stats as a slow right-to-left ticker.
function BriefingMarquee({ isPaused, items }: { isPaused: boolean; items: BriefingItem[] }) {
  const loopItems = items.length ? items : [{ label: "Briefing", value: "No local stats available", tone: "neutral" as const }];

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div className={cn("briefing-marquee-track flex w-max items-center gap-3", isPaused && "briefing-marquee-paused")}>
        <BriefingMarqueeSet items={loopItems} />
        <BriefingMarqueeSet ariaHidden items={loopItems} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-[linear-gradient(90deg,#191929,rgba(25,25,41,0))]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-[linear-gradient(270deg,#191929,rgba(25,25,41,0))]" />
    </div>
  );
}

// BriefingMarqueeSet renders one duplicated sequence used by the seamless marquee loop.
function BriefingMarqueeSet({ ariaHidden = false, items }: { ariaHidden?: boolean; items: BriefingItem[] }) {
  return (
    <div aria-hidden={ariaHidden} className="flex items-center gap-3 pr-3">
      {items.map((item) => (
        <span key={`${item.label}-${item.value}`} className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</span>
          <span className={cn("font-bold", briefingToneClass(item.tone))}>{item.value}</span>
          <span className="text-border">•</span>
        </span>
      ))}
    </div>
  );
}

// BriefingExpandedCard renders one full briefing item when the marquee is opened.
function BriefingExpandedCard({ item }: { item: BriefingItem }) {
  return (
    <div className="rounded-xl border bg-[#202034]/75 p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
      <p className={cn("mt-1 truncate font-mono text-sm font-bold", briefingToneClass(item.tone))}>{item.value}</p>
      {item.detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}
    </div>
  );
}

// briefingToneClass maps briefing stat intent to the premium finance color language.
function briefingToneClass(tone: BriefingItem["tone"]) {
  if (tone === "accent") {
    return "text-primary";
  }

  if (tone === "negative") {
    return "text-rose-300";
  }

  if (tone === "positive") {
    return "text-emerald-300";
  }

  if (tone === "warning") {
    return "text-amber-200";
  }

  return "text-foreground";
}

// DataStatusPanel explains which app values are CSV-backed, placeholder-backed, or provider-backed.
function DataStatusPanel({ items, onClose, providers }: { items: InsightDataStatusItem[]; onClose: () => void; providers: ProviderStatus[] }) {
  return (
    <div className="pill-scrollbar absolute inset-x-0 top-0 z-40 max-h-[min(78vh,680px)] overflow-y-auto rounded-2xl border bg-[#191929]/98 p-3 shadow-[0_22px_60px_rgba(0,0,0,0.48)] ring-1 ring-primary/15 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="soft-pulse mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border bg-secondary text-primary">
          <Database className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-primary">Data Status</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <DataStatusCard key={item.label} item={item} />
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Data Providers</p>
                <p className="mt-1 text-xs text-muted-foreground">Local env readiness, SQLite cache, and free-tier request guards.</p>
              </div>
              <span className="rounded-full border bg-[#202034]/75 px-2 py-1 font-mono text-[10px] text-muted-foreground">offline-safe by default</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => (
                <ProviderStatusCard key={provider.provider} provider={provider} />
              ))}
            </div>
          </div>
        </div>
        <button
          className="shrink-0 rounded-xl border p-2 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          onClick={onClose}
          type="button"
          aria-label="Close data status"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ProviderStatusCard renders one optional API/feed status without exposing any secret values.
function ProviderStatusCard({ provider }: { provider: ProviderStatus }) {
  return (
    <div className="rounded-xl border bg-[#202034]/75 p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{provider.label}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{provider.provider}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]",
            provider.tone === "accent" && "border-primary/40 text-primary",
            provider.tone === "positive" && "border-emerald-300/30 text-emerald-300",
            provider.tone === "warning" && "border-amber-200/30 text-amber-200",
            provider.tone === "neutral" && "border-border text-muted-foreground",
          )}
        >
          {provider.enabled ? "Ready" : "Missing env"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{provider.detail}</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <ProviderMiniMetric label="Cache" value={provider.cacheLabel} />
        <ProviderMiniMetric label="Fresh/Stale" value={`${provider.cacheFreshEntries}/${provider.cacheStaleEntries}`} />
        <ProviderMiniMetric label="Limit" value={provider.quota} />
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{provider.usageDetail}</p>
      {!provider.enabled ? (
        <p className="mt-2 truncate font-mono text-[10px] text-amber-200">{provider.missingEnv.join(", ")}</p>
      ) : null}
    </div>
  );
}

// ProviderMiniMetric renders a tiny provider counter for dense status cards.
function ProviderMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-[#191929]/75 px-2 py-1.5">
      <p className="truncate text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-foreground">{value}</p>
    </div>
  );
}

// DataStatusCard renders one source or assumption in the Data Status popout.
function DataStatusCard({ item }: { item: InsightDataStatusItem }) {
  return (
    <div className="rounded-xl border bg-[#202034]/75 p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold text-foreground">{item.label}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]",
            item.tone === "accent" && "border-primary/40 text-primary",
            item.tone === "negative" && "border-rose-300/30 text-rose-300",
            item.tone === "positive" && "border-emerald-300/30 text-emerald-300",
            item.tone === "warning" && "border-amber-200/30 text-amber-200",
            (!item.tone || item.tone === "neutral") && "border-border text-muted-foreground",
          )}
        >
          {item.value}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
    </div>
  );
}

// InsightChipPill renders one compact metric chip in the ribbon.
function InsightChipPill({ chip }: { chip: InsightChip }) {
  return (
    <div className="min-w-0 rounded-xl border bg-[#191929]/70 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-muted-foreground">{chip.label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-mono text-xs font-semibold",
          chip.tone === "accent" && "text-primary",
          chip.tone === "negative" && "text-rose-300",
          chip.tone === "positive" && "text-emerald-300",
          chip.tone === "warning" && "text-amber-200",
          (!chip.tone || chip.tone === "neutral") && "text-foreground",
        )}
      >
        {chip.value}
      </p>
    </div>
  );
}

// getRoutePayload selects the matching route payload from the server-built local data.
function getRoutePayload(pathname: string, data: InsightRibbonData, analyzerSnapshot: InsightRoutePayload | null) {
  if (pathname.startsWith("/dividends")) {
    return data.dividends;
  }

  if (pathname.startsWith("/transactions")) {
    return data.transactions;
  }

  if (pathname.startsWith("/drip")) {
    return data.drip;
  }

  if (pathname.startsWith("/analyzer")) {
    return analyzerSnapshot ?? data.analyzer;
  }

  if (pathname.startsWith("/data-providers")) {
    return data.dataProviders;
  }

  return data.dashboard;
}

// subscribeAnalyzerStorage lets the ribbon react when saved Analyzer data changes in this browser.
function subscribeAnalyzerStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}

// getAnalyzerStorageSnapshot reads the two Analyzer localStorage keys as one stable serialized snapshot.
function getAnalyzerStorageSnapshot() {
  if (typeof window === "undefined") {
    return getEmptyAnalyzerStorageSnapshot();
  }

  return JSON.stringify({
    recentScans: window.localStorage.getItem("codex-oracle.analyzer.recent-scans") ?? "[]",
    watchlist: window.localStorage.getItem("codex-oracle.analyzer.watchlist") ?? "[]",
  });
}

// getEmptyAnalyzerStorageSnapshot keeps server rendering deterministic before browser storage exists.
function getEmptyAnalyzerStorageSnapshot() {
  return JSON.stringify({
    recentScans: "[]",
    watchlist: "[]",
  });
}

// readAnalyzerSnapshot enriches the Analyzer ribbon from browser-local watchlist storage.
function readAnalyzerSnapshot(storageSnapshot: string): InsightRoutePayload | null {

  try {
    const storage = JSON.parse(storageSnapshot) as { recentScans: string; watchlist: string };
    const watchlist = JSON.parse(storage.watchlist) as Array<{
      ticker?: string;
      grade?: string;
      score?: number;
      lastScannedAt?: string;
    }>;
    const recentScans = JSON.parse(storage.recentScans) as Array<{ ticker?: string; scannedAt?: string }>;
    const bestSaved = watchlist.slice().sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
    const lastScan = recentScans[0];

    return {
      briefingItems: [
        { label: "Watchlist", value: String(watchlist.length), tone: "accent" },
        { label: "Highest Grade", value: bestSaved ? `${bestSaved.ticker ?? "-"} ${bestSaved.grade ?? "-"} / ${bestSaved.score ?? "-"}` : "-", tone: bestSaved ? "positive" : "neutral" },
        { label: "Recent Scan", value: lastScan?.ticker ?? "-", tone: "neutral" },
        { label: "Feed", value: "Offline", tone: "warning" },
      ],
      chips: [
        { label: "Watchlist", value: String(watchlist.length), tone: "accent" },
        { label: "Best Grade", value: bestSaved ? `${bestSaved.ticker ?? "-"} ${bestSaved.grade ?? "-"}` : "-", tone: "positive" },
        { label: "Recent", value: lastScan?.ticker ?? "-", tone: "neutral" },
        { label: "Feed", value: "Offline", tone: "warning" },
      ],
      briefings: [
        bestSaved ? `${bestSaved.ticker} is the strongest saved analyzer scan at ${bestSaved.grade} / ${bestSaved.score}.` : "Save analyzer scans to build a local watchlist with scores and grades.",
        lastScan ? `The most recent analyzer scan stored in this browser is ${lastScan.ticker}.` : "Recent scans will appear after the first local technical analysis run.",
        "Analyzer results remain local, prefer cached research candles when configured, and fall back to mock OHLC when provider data is unavailable.",
      ],
    };
  } catch {
    return null;
  }
}
