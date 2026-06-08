import { getSqlite } from "@/lib/db/connection";
import { freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import type { ExternalDataSource } from "@/lib/external-data/types";

// ProviderCacheBreakdown groups cache rows by route/endpoint so stale data is easy to spot.
export type ProviderCacheBreakdown = {
  cacheKeyPrefix: string;
  endpoint: string;
  freshEntries: number;
  label: string;
  latestFetch: string | null;
  latestFetchLabel: string;
  staleEntries: number;
  totalEntries: number;
};

// ProviderStatus explains one optional external provider without exposing secrets.
export type ProviderStatus = {
  appRole: string;
  cacheBreakdown: ProviderCacheBreakdown[];
  cacheEntries: number;
  cacheFreshEntries: number;
  cacheHealthPercent: number;
  cacheLabel: string;
  cacheStaleEntries: number;
  capabilities: string[];
  detail: string;
  dayUsagePercent: number;
  enabled: boolean;
  envKeys: string[];
  futureOptions: string[];
  label: string;
  latestCacheFetch: string | null;
  latestCacheFetchLabel: string;
  latestCacheExpiry: string | null;
  missingEnv: string[];
  minuteUsagePercent: number;
  provider: ExternalDataSource;
  quota: string;
  setupNote: string;
  tone: "accent" | "positive" | "neutral" | "warning";
  usage: string;
  usageDetail: string;
  usageTone: "accent" | "positive" | "warning";
};

// getProviderStatuses reports env readiness, local cache entries, and free-tier guardrails.
export function getProviderStatuses(): ProviderStatus[] {
  const cacheRows = readProviderCacheRows();
  const usageRows = readProviderUsageRows();

  return providerOrder.map((provider) => {
    const availability = getProviderAvailability(provider);
    const providerCacheRows = cacheRows.filter((row) => row.provider === provider);
    const cacheEntries = providerCacheRows.length;
    const cacheStaleEntries = providerCacheRows.filter((row) => new Date(row.expiresAt).getTime() <= Date.now()).length;
    const cacheFreshEntries = cacheEntries - cacheStaleEntries;
    const cacheHealthPercent = cacheEntries > 0 ? Math.round((cacheFreshEntries / cacheEntries) * 100) : 0;
    const latestCache = providerCacheRows
      .sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt))[0];
    const usage = usageRows.find((row) => row.provider === provider);
    const budget = budgetByProvider[provider];
    const enabled = availability.enabled;
    const meta = providerMeta[provider];
    const minuteCount = usage?.minuteCount ?? 0;
    const dayCount = usage?.dayCount ?? 0;
    const minuteRatio = minuteCount / budget.maxPerMinute;
    const dayRatio = dayCount / budget.maxPerDay;
    const minuteUsagePercent = Math.min(Math.round(minuteRatio * 100), 100);
    const dayUsagePercent = Math.min(Math.round(dayRatio * 100), 100);
    const usageTone = minuteRatio >= 0.8 || dayRatio >= 0.8 ? "warning" : minuteCount > 0 || dayCount > 0 ? "accent" : "positive";
    const cacheLabel = cacheEntries === 0 ? "Empty" : cacheFreshEntries > 0 ? `${cacheFreshEntries} fresh` : `${cacheStaleEntries} stale`;
    const cacheDetail = latestCache
      ? ` Latest cache fetch: ${formatDateTime(latestCache.fetchedAt)}. Cache expires: ${formatDateTime(latestCache.expiresAt)}.`
      : " No cached responses yet.";

    return {
      appRole: meta.appRole,
      cacheBreakdown: buildCacheBreakdown(providerCacheRows),
      cacheEntries,
      cacheFreshEntries,
      cacheHealthPercent,
      cacheLabel,
      cacheStaleEntries,
      capabilities: meta.capabilities,
      dayUsagePercent,
      detail: enabled
        ? `${meta.label} is configured locally. Keys stay server-side and are never sent to the browser.${cacheDetail}`
        : `${meta.label} is offline-safe until ${availability.missingEnv.join(", ")} is added to local env.${cacheDetail}`,
      enabled,
      envKeys: meta.envKeys,
      futureOptions: meta.futureOptions,
      label: meta.label,
      latestCacheExpiry: latestCache?.expiresAt ?? null,
      latestCacheFetch: latestCache?.fetchedAt ?? null,
      latestCacheFetchLabel: latestCache ? formatRelativeAge(latestCache.fetchedAt) : "No cache",
      missingEnv: availability.missingEnv,
      minuteUsagePercent,
      provider,
      quota: `${budget.maxPerMinute}/min ${budget.maxPerDay}/day`,
      setupNote: meta.setupNote,
      tone: enabled ? "positive" : provider === "sec-edgar" ? "accent" : "warning",
      usage: `${minuteCount}/min ${dayCount}/day`,
      usageDetail: `${minuteCount} of ${budget.maxPerMinute} minute-window calls and ${dayCount} of ${budget.maxPerDay} daily calls used in the local SQLite budget counter.`,
      usageTone,
    };
  });
}

// readProviderCacheRows returns lightweight cache metadata from local SQLite.
function readProviderCacheRows(): Array<{ cacheKey: string; expiresAt: string; fetchedAt: string; provider: ExternalDataSource }> {
  try {
    return getSqlite()
      .prepare("SELECT cache_key AS cacheKey, provider, fetched_at AS fetchedAt, expires_at AS expiresAt FROM provider_cache")
      .all() as Array<{ cacheKey: string; expiresAt: string; fetchedAt: string; provider: ExternalDataSource }>;
  } catch {
    return [];
  }
}

// readProviderUsageRows returns local request counters used by provider budget guards.
function readProviderUsageRows(): Array<{ dayCount: number; minuteCount: number; provider: ExternalDataSource }> {
  try {
    return getSqlite()
      .prepare("SELECT provider, day_count AS dayCount, minute_count AS minuteCount FROM api_usage")
      .all() as Array<{ dayCount: number; minuteCount: number; provider: ExternalDataSource }>;
  } catch {
    return [];
  }
}

// buildCacheBreakdown groups cache entries by endpoint name parsed from cache keys.
function buildCacheBreakdown(rows: Array<{ cacheKey: string; expiresAt: string; fetchedAt: string }>): ProviderCacheBreakdown[] {
  const now = Date.now();
  const byEndpoint = rows.reduce<Map<string, Array<{ cacheKey: string; expiresAt: string; fetchedAt: string }>>>((groups, row) => {
    const endpoint = parseCacheEndpoint(row.cacheKey);
    groups.set(endpoint, [...(groups.get(endpoint) ?? []), row]);
    return groups;
  }, new Map());

  return Array.from(byEndpoint.entries())
    .map(([endpoint, endpointRows]) => {
      const latest = endpointRows.slice().sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt))[0];
      const staleEntries = endpointRows.filter((row) => new Date(row.expiresAt).getTime() <= now).length;

      return {
        cacheKeyPrefix: endpointRows[0]?.cacheKey.split(":").slice(0, 2).join(":") ?? endpoint,
        endpoint,
        freshEntries: endpointRows.length - staleEntries,
        label: formatEndpointName(endpoint),
        latestFetch: latest?.fetchedAt ?? null,
        latestFetchLabel: latest ? formatRelativeAge(latest.fetchedAt) : "No cache",
        staleEntries,
        totalEntries: endpointRows.length,
      };
    })
    .sort((left, right) => right.totalEntries - left.totalEntries || left.label.localeCompare(right.label));
}

// parseCacheEndpoint extracts the route-like endpoint segment from cache keys.
function parseCacheEndpoint(cacheKey: string) {
  return cacheKey.split(":")[1] || "unknown";
}

// formatEndpointName converts cache endpoint ids into readable feature names.
function formatEndpointName(endpoint: string) {
  const labels: Record<string, string> = {
    "company-facts": "SEC facts",
    "historical-ohlc": "OHLC candles",
    news: "Ticker news",
    quote: "Quotes",
    "quote-batch": "Batch quotes",
    "ticker-index": "Ticker index",
  };

  return labels[endpoint] ?? endpoint;
}

// formatDateTime keeps provider cache timestamps compact inside status cards.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

// formatRelativeAge summarizes when the latest cache entry was fetched.
function formatRelativeAge(value: string) {
  const ageMs = Math.max(Date.now() - new Date(value).getTime(), 0);
  const minutes = Math.round(ageMs / (1000 * 60));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = minutes / 60;

  if (hours < 48) {
    return `${hours.toFixed(1)}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

// providerOrder controls the display order for provider status surfaces.
const providerOrder: ExternalDataSource[] = ["sec-edgar", "twelve-data", "fmp", "alpha-vantage", "rss-news"];

// providerMeta stores user-facing setup details for each optional provider.
const providerMeta: Record<ExternalDataSource, {
  appRole: string;
  capabilities: string[];
  envKeys: string[];
  futureOptions: string[];
  label: string;
  setupNote: string;
}> = {
  "alpha-vantage": {
    appRole: "Backup analyzer candles if Twelve Data is unavailable.",
    capabilities: ["Fallback historical OHLC candles"],
    envKeys: ["ALPHA_VANTAGE_API_KEY"],
    futureOptions: ["Keep as OHLC fallback if Twelve Data becomes the primary candle provider.", "Could be replaced by Polygon, Tiingo, or paid FMP historical data later."],
    label: "Alpha Vantage",
    setupNote: "Useful as a backup OHLC source when Twelve Data is not configured or unavailable.",
  },
  fmp: {
    appRole: "Manual dashboard quote refresh and ticker news when your FMP plan allows it.",
    capabilities: ["Recommended news provider", "Fallback quote", "Ticker news headlines"],
    envKeys: ["FMP_API_KEY"],
    futureOptions: ["Stay on the free Basic key while calls fit inside local cache and budget guards.", "If stock news is gated for your key, upgrade later to Starter or switch news to RSS without changing the drawer UI.", "Future paid options can add FMP fundamentals, analyst ratings, price targets, or broader market news."],
    label: "Financial Modeling Prep",
    setupNote: "Recommended first for news. Add the free key as FMP_API_KEY; the app uses cached ticker news and falls back safely if a specific endpoint is unavailable on the free plan.",
  },
  "rss-news": {
    appRole: "No-cost backup news feed for scan snapshots and watchlist headlines.",
    capabilities: ["Custom ticker news feed"],
    envKeys: ["STOCK_NEWS_RSS_URL_TEMPLATE"],
    futureOptions: ["Use as the no-cost backup if FMP news is limited.", "Can point at any RSS provider that supports a {ticker} URL template."],
    label: "RSS News",
    setupNote: "Use a URL template containing {ticker}; refreshed headlines are cached in SQLite.",
  },
  "sec-edgar": {
    appRole: "Primary fundamentals source for Graham/Buffett scoring.",
    capabilities: ["Fundamentals", "Graham/Buffett scoring inputs"],
    envKeys: ["SEC_EDGAR_USER_AGENT"],
    futureOptions: ["Keep as the trusted fundamentals baseline even if paid fundamentals are added later.", "Future scoring can add more SEC facts for earnings stability and multi-year growth."],
    label: "SEC EDGAR",
    setupNote: "Recommended first. SEC asks for a contact-style User-Agent such as an email or app/contact string.",
  },
  "twelve-data": {
    appRole: "Primary analyzer candles and quote source; dashboard reuses cached quotes.",
    capabilities: ["Live/delayed quote", "Historical OHLC candles"],
    envKeys: ["TWELVE_DATA_API_KEY"],
    futureOptions: ["Use for live/cached analyzer candles if the free tier fits your scan frequency.", "Can be swapped for Polygon, Tiingo, or paid FMP market data later through the same provider interface."],
    label: "Twelve Data",
    setupNote: "Best first market-data key for analyzer quote and historical candle replacement.",
  },
};

// budgetByProvider lets status surfaces show local guardrails without duplicating provider budgets in UI code.
const budgetByProvider = {
  "alpha-vantage": freeApiBudgets.alphaVantage,
  fmp: freeApiBudgets.fmp,
  "rss-news": freeApiBudgets.rssNews,
  "sec-edgar": freeApiBudgets.secEdgar,
  "twelve-data": freeApiBudgets.twelveData,
} satisfies Record<ExternalDataSource, { maxPerDay: number; maxPerMinute: number }>;
