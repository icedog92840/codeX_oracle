import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
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
  image?: string;
  publishedDate?: string;
  site?: string;
  symbol?: string;
  text?: string;
  title?: string;
  url?: string;
}>;

// getFmpQuote returns a fallback quote when FMP_API_KEY is configured.
export async function getFmpQuote(ticker: string): Promise<LiveQuote | null> {
  const availability = getProviderAvailability("fmp");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL(`https://financialmodelingprep.com/api/v3/quote/${symbol}`);
  url.searchParams.set("apikey", process.env.FMP_API_KEY ?? "");
  const response = await fetchJsonWithCache<FmpQuoteResponse>({
    budget: freeApiBudgets.fmp,
    cacheParts: { symbol },
    endpoint: "quote",
    provider: "fmp",
    ttlMs: cacheTtls.quote,
    url: url.toString(),
  });
  const quote = response.data[0];

  if (!quote?.price) {
    return null;
  }

  return {
    name: quote.name,
    percentChange: quote.changesPercentage,
    price: quote.price,
    source: "fmp",
    ticker: quote.symbol ?? symbol,
  };
}

// getFmpStockNews returns recent ticker headlines when FMP_API_KEY is configured.
export async function getFmpStockNews(ticker: string, limit = 10): Promise<StockNewsItem[]> {
  const availability = getProviderAvailability("fmp");

  if (!availability.enabled) {
    return [];
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://financialmodelingprep.com/api/v3/stock_news");
  url.searchParams.set("apikey", process.env.FMP_API_KEY ?? "");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("tickers", symbol);
  const response = await fetchJsonWithCache<FmpNewsResponse>({
    budget: freeApiBudgets.fmp,
    cacheParts: { limit, symbol },
    endpoint: "stock_news",
    provider: "fmp",
    ttlMs: cacheTtls.news,
    url: url.toString(),
  });

  return response.data
    .filter((item) => item.title && item.url)
    .map((item) => ({
      publishedAt: item.publishedDate,
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
