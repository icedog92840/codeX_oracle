import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
import { buildSourceFreshness } from "@/lib/external-data/freshness";
import type { LiveQuote, StockNewsItem } from "@/lib/external-data/types";

// FmpQuoteResponse matches the quote fields used from Financial Modeling Prep.
type FmpQuoteResponse = Array<{
  changesPercentage?: number;
  name?: string;
  price?: number;
  symbol?: string;
}>;

// FmpNewsResponse matches the stock-news fields used from Financial Modeling Prep.
type FmpNewsResponse = Array<{
  date?: string;
  image?: string;
  publishedDate?: string;
  site?: string;
  symbol?: string;
  text?: string;
  title?: string;
  url?: string;
}>;

// getFmpQuote returns a fallback quote when FMP_API_KEY is configured.
export async function getFmpQuote(ticker: string, options: { forceRefresh?: boolean } = {}): Promise<LiveQuote | null> {
  const availability = getProviderAvailability("fmp");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://financialmodelingprep.com/stable/quote");
  url.searchParams.set("apikey", process.env.FMP_API_KEY ?? "");
  url.searchParams.set("symbol", symbol);
  const response = await fetchJsonWithCache<FmpQuoteResponse>({
    budget: freeApiBudgets.fmp,
    cacheParts: { symbol },
    endpoint: "quote",
    forceRefresh: options.forceRefresh,
    provider: "fmp",
    ttlMs: cacheTtls.quote,
    url: url.toString(),
  });
  const quote = response.data[0];

  if (!quote?.price) {
    return null;
  }

  return {
    freshness: buildSourceFreshness(response),
    name: quote.name,
    percentChange: quote.changesPercentage,
    price: quote.price,
    source: "fmp",
    ticker: quote.symbol ?? symbol,
  };
}

// getFmpBatchQuotes returns multiple quotes in one request when FMP batch access is available.
export async function getFmpBatchQuotes(tickers: string[], options: { forceRefresh?: boolean } = {}): Promise<LiveQuote[]> {
  const availability = getProviderAvailability("fmp");
  const symbols = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean))).sort();

  if (!availability.enabled || symbols.length === 0) {
    return [];
  }

  const url = new URL("https://financialmodelingprep.com/stable/batch-quote");
  url.searchParams.set("apikey", process.env.FMP_API_KEY ?? "");
  url.searchParams.set("symbols", symbols.join(","));
  const response = await fetchJsonWithCache<FmpQuoteResponse>({
    budget: freeApiBudgets.fmp,
    cacheParts: { symbols: symbols.join(",") },
    endpoint: "batch_quote",
    forceRefresh: options.forceRefresh,
    provider: "fmp",
    ttlMs: cacheTtls.quote,
    url: url.toString(),
  });

  return response.data
    .filter((quote) => quote.symbol && quote.price && quote.price > 0)
    .map((quote) => ({
      freshness: buildSourceFreshness(response),
      name: quote.name,
      percentChange: quote.changesPercentage,
      price: quote.price ?? 0,
      source: "fmp",
      ticker: quote.symbol ?? "",
    }));
}

// getFmpStockNews returns recent ticker headlines when FMP_API_KEY is configured.
export async function getFmpStockNews(ticker: string, limit = 10, options: { forceRefresh?: boolean } = {}): Promise<StockNewsItem[]> {
  const availability = getProviderAvailability("fmp");

  if (!availability.enabled) {
    return [];
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://financialmodelingprep.com/stable/news/stock");
  url.searchParams.set("apikey", process.env.FMP_API_KEY ?? "");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("symbols", symbol);
  const response = await fetchJsonWithCache<FmpNewsResponse>({
    budget: freeApiBudgets.fmp,
    cacheParts: { limit, symbol },
    endpoint: "stock_news",
    forceRefresh: options.forceRefresh,
    provider: "fmp",
    ttlMs: cacheTtls.news,
    url: url.toString(),
  });

  return response.data
    .filter((item) => item.title && item.url)
    .map((item) => ({
      publishedAt: item.publishedDate ?? item.date,
      freshness: buildSourceFreshness(response),
      source: "fmp",
      sourceName: item.site,
      summary: item.text,
      title: item.title ?? "",
      url: item.url ?? "",
    }));
}

// normalizeTicker keeps provider requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
