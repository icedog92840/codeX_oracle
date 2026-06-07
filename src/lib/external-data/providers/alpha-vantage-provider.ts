import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
import { buildSourceFreshness } from "@/lib/external-data/freshness";
import type { HistoricalOhlc } from "@/lib/external-data/types";

// AlphaVantageDailyResponse matches the adjusted daily endpoint fields we use as a fallback.
type AlphaVantageDailyResponse = {
  "Time Series (Daily)"?: Record<string, {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "6. volume"?: string;
  }>;
};

// getAlphaVantageHistoricalOhlc returns fallback daily candles when ALPHA_VANTAGE_API_KEY is configured.
export async function getAlphaVantageHistoricalOhlc(ticker: string, outputSize = 200, options: { forceRefresh?: boolean } = {}): Promise<HistoricalOhlc | null> {
  const availability = getProviderAvailability("alpha-vantage");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("apikey", process.env.ALPHA_VANTAGE_API_KEY ?? "");
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("symbol", symbol);

  const response = await fetchJsonWithCache<AlphaVantageDailyResponse>({
    budget: freeApiBudgets.alphaVantage,
    cacheParts: { outputSize, symbol },
    endpoint: "daily_adjusted",
    forceRefresh: options.forceRefresh,
    provider: "alpha-vantage",
    ttlMs: cacheTtls.historicalOhlc,
    url: url.toString(),
  });
  const series = response.data["Time Series (Daily)"] ?? {};

  return {
    candles: Object.entries(series)
      .slice(0, outputSize)
      .reverse()
      .map(([date, value]) => ({
        close: Number(value["4. close"]),
        date,
        high: Number(value["2. high"]),
        low: Number(value["3. low"]),
        open: Number(value["1. open"]),
        volume: value["6. volume"] ? Number(value["6. volume"]) : undefined,
      })),
    freshness: buildSourceFreshness(response),
    source: "alpha-vantage",
    ticker: symbol,
  };
}

// normalizeTicker keeps provider requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
