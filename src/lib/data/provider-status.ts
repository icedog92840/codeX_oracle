import { getSqlite } from "@/lib/db/connection";
import { freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import type { ExternalDataSource } from "@/lib/external-data/types";

// ProviderStatus explains one optional external provider without exposing secrets.
export type ProviderStatus = {
  cacheEntries: number;
  capabilities: string[];
  detail: string;
  enabled: boolean;
  envKeys: string[];
  label: string;
  missingEnv: string[];
  provider: ExternalDataSource;
  quota: string;
  setupNote: string;
  tone: "accent" | "positive" | "neutral" | "warning";
  usage: string;
};

// getProviderStatuses reports env readiness, local cache entries, and free-tier guardrails.
export function getProviderStatuses(): ProviderStatus[] {
  const cacheRows = readProviderCacheRows();
  const usageRows = readProviderUsageRows();

  return providerOrder.map((provider) => {
    const availability = getProviderAvailability(provider);
    const cacheEntries = cacheRows.filter((row) => row.provider === provider).length;
    const latestCache = cacheRows
      .filter((row) => row.provider === provider)
      .sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt))[0];
    const usage = usageRows.find((row) => row.provider === provider);
    const budget = budgetByProvider[provider];
    const enabled = availability.enabled;
    const meta = providerMeta[provider];
    const cacheDetail = latestCache ? ` Latest cache fetch: ${formatDateTime(latestCache.fetchedAt)}.` : " No cached responses yet.";

    return {
      cacheEntries,
      capabilities: meta.capabilities,
      detail: enabled
        ? `${meta.label} is configured locally. Keys stay server-side and are never sent to the browser.${cacheDetail}`
        : `${meta.label} is offline-safe until ${availability.missingEnv.join(", ")} is added to local env.${cacheDetail}`,
      enabled,
      envKeys: meta.envKeys,
      label: meta.label,
      missingEnv: availability.missingEnv,
      provider,
      quota: `${budget.maxPerMinute}/min ${budget.maxPerDay}/day`,
      setupNote: meta.setupNote,
      tone: enabled ? "positive" : provider === "sec-edgar" ? "accent" : "warning",
      usage: usage ? `${usage.minuteCount}/min ${usage.dayCount}/day` : "0/min 0/day",
    };
  });
}

// readProviderCacheRows returns lightweight cache metadata from local SQLite.
function readProviderCacheRows(): Array<{ fetchedAt: string; provider: ExternalDataSource }> {
  try {
    return getSqlite()
      .prepare("SELECT provider, fetched_at AS fetchedAt FROM provider_cache")
      .all() as Array<{ fetchedAt: string; provider: ExternalDataSource }>;
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

// formatDateTime keeps provider cache timestamps compact inside status cards.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

// providerOrder controls the display order for provider status surfaces.
const providerOrder: ExternalDataSource[] = ["sec-edgar", "twelve-data", "fmp", "alpha-vantage", "rss-news"];

// providerMeta stores user-facing setup details for each optional provider.
const providerMeta: Record<ExternalDataSource, {
  capabilities: string[];
  envKeys: string[];
  label: string;
  setupNote: string;
}> = {
  "alpha-vantage": {
    capabilities: ["Fallback historical OHLC candles"],
    envKeys: ["ALPHA_VANTAGE_API_KEY"],
    label: "Alpha Vantage",
    setupNote: "Useful as a backup OHLC source when Twelve Data is not configured or unavailable.",
  },
  fmp: {
    capabilities: ["Fallback quote", "Ticker news headlines"],
    envKeys: ["FMP_API_KEY"],
    label: "Financial Modeling Prep",
    setupNote: "Useful for quote fallback and stock-specific news once an FMP key is added.",
  },
  "rss-news": {
    capabilities: ["Custom ticker news feed"],
    envKeys: ["STOCK_NEWS_RSS_URL_TEMPLATE"],
    label: "RSS News",
    setupNote: "Use a URL template containing {ticker}; refreshed headlines are cached in SQLite.",
  },
  "sec-edgar": {
    capabilities: ["Fundamentals", "Graham/Buffett scoring inputs"],
    envKeys: ["SEC_EDGAR_USER_AGENT"],
    label: "SEC EDGAR",
    setupNote: "Recommended first. SEC asks for a contact-style User-Agent such as an email or app/contact string.",
  },
  "twelve-data": {
    capabilities: ["Live/delayed quote", "Historical OHLC candles"],
    envKeys: ["TWELVE_DATA_API_KEY"],
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
