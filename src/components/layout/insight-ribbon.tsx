"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight, Database, Pause, Sparkles, X } from "lucide-react";
import type { InsightChip, InsightDataStatusItem, InsightProviderStatus, InsightRibbonData, InsightRoutePayload } from "@/lib/data/insight-ribbon";
import { cn } from "@/lib/utils";

// InsightRibbon replaces the old search placeholder with page-aware local portfolio context.
export function InsightRibbon({ data }: { data: InsightRibbonData }) {
  const [activeIndex, setActiveIndex] = useState(0);
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
  const rotationItems = useMemo(() => buildRotationItems(routePayload, data.principles), [data.principles, routePayload]);
  const activeItem = rotationItems[activeIndex % rotationItems.length];

  useEffect(() => {
    if (isPaused || isExpanded) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % rotationItems.length);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [isExpanded, isPaused, rotationItems.length]);

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
            className="relative min-w-0 rounded-xl border bg-[#191929]/80 px-3 py-2 text-left outline-none transition-colors hover:border-primary/50 hover:bg-[#202034] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
            onClick={() => {
              setIsDataOpen(false);
              setIsExpanded(true);
            }}
            type="button"
            aria-expanded={isExpanded}
            aria-label="Open full portfolio briefing"
          >
            <div className="flex min-w-0 items-center gap-2">
              {activeItem.type === "principle" ? (
                <Sparkles className="size-3.5 shrink-0 text-accent-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <p key={`${pathname}-${activeIndex}`} className="insight-slide min-w-0 truncate text-xs text-muted-foreground md:text-sm">
                <span className="font-medium text-foreground">{activeItem.label}</span>
                <span className="mx-1.5 text-border">/</span>
                {activeItem.text}
              </p>
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
              {activeItem.type === "principle" ? <Sparkles className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-primary">{activeItem.label}</p>
              <p className="mt-1 text-sm leading-6 text-foreground">{activeItem.text}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="rounded-xl border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                onClick={() => setActiveIndex((currentIndex) => (currentIndex + 1) % rotationItems.length)}
                type="button"
              >
                Next
              </button>
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

// DataStatusPanel explains which app values are CSV-backed, placeholder-backed, or provider-backed.
function DataStatusPanel({ items, onClose, providers }: { items: InsightDataStatusItem[]; onClose: () => void; providers: InsightProviderStatus[] }) {
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
function ProviderStatusCard({ provider }: { provider: InsightProviderStatus }) {
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
        <ProviderMiniMetric label="Cache" value={String(provider.cacheEntries)} />
        <ProviderMiniMetric label="Used" value={provider.usage} />
        <ProviderMiniMetric label="Limit" value={provider.quota} />
      </div>
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

  return data.dashboard;
}

// buildRotationItems mixes route-specific briefings with investing principles.
function buildRotationItems(routePayload: InsightRoutePayload, principles: string[]) {
  return [
    ...routePayload.briefings.map((text) => ({ label: "Briefing", text, type: "briefing" as const })),
    ...principles.map((text) => ({ label: "Principle", text, type: "principle" as const })),
  ];
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
      chips: [
        { label: "Watchlist", value: String(watchlist.length), tone: "accent" },
        { label: "Best Grade", value: bestSaved ? `${bestSaved.ticker ?? "-"} ${bestSaved.grade ?? "-"}` : "-", tone: "positive" },
        { label: "Recent", value: lastScan?.ticker ?? "-", tone: "neutral" },
        { label: "Feed", value: "Offline", tone: "warning" },
      ],
      briefings: [
        bestSaved ? `${bestSaved.ticker} is the strongest saved analyzer scan at ${bestSaved.grade} / ${bestSaved.score}.` : "Save analyzer scans to build a local watchlist with scores and grades.",
        lastScan ? `The most recent analyzer scan stored in this browser is ${lastScan.ticker}.` : "Recent scans will appear after the first local technical analysis run.",
        "Analyzer results remain local and use mock OHLC data until a live market-data feed is connected.",
      ],
    };
  } catch {
    return null;
  }
}
