import type { ExternalDataSource, ProviderAvailability } from "@/lib/external-data/types";

// cacheTtls stores conservative freshness windows so repeated scans reuse local data first.
export const cacheTtls = {
  companyFacts: 7 * 24 * 60 * 60 * 1000,
  historicalOhlc: 12 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
  quote: 10 * 60 * 1000,
  tickerIndex: 30 * 24 * 60 * 60 * 1000,
};

// freeApiBudgets keeps local calls safely below common free-tier and fair-use limits.
export const freeApiBudgets = {
  alphaVantage: { maxPerDay: 25, maxPerMinute: 5, provider: "alpha-vantage" as const },
  fmp: { maxPerDay: 250, maxPerMinute: 20, provider: "fmp" as const },
  rssNews: { maxPerDay: 1000, maxPerMinute: 30, provider: "rss-news" as const },
  secEdgar: { maxPerDay: 5000, maxPerMinute: 300, provider: "sec-edgar" as const },
  twelveData: { maxPerDay: 800, maxPerMinute: 8, provider: "twelve-data" as const },
};

// providerEnv maps optional live providers to the environment variables they need.
export const providerEnv: Record<ExternalDataSource, string[]> = {
  "alpha-vantage": ["ALPHA_VANTAGE_API_KEY"],
  fmp: ["FMP_API_KEY"],
  "rss-news": ["STOCK_NEWS_RSS_URL_TEMPLATE"],
  "sec-edgar": ["SEC_EDGAR_USER_AGENT"],
  "twelve-data": ["TWELVE_DATA_API_KEY"],
};

// getProviderAvailability reports whether a provider has the local env needed to run.
export function getProviderAvailability(provider: ExternalDataSource): ProviderAvailability {
  const missingEnv = providerEnv[provider].filter((key) => !process.env[key]);

  return {
    enabled: missingEnv.length === 0,
    missingEnv,
    provider,
  };
}
