import { getAlphaVantageHistoricalOhlc } from "@/lib/external-data/providers/alpha-vantage-provider";
import { getFmpQuote, getFmpStockNews } from "@/lib/external-data/providers/fmp-provider";
import { getConfiguredRssNews } from "@/lib/external-data/providers/rss-news-provider";
import { getSecFundamentals } from "@/lib/external-data/providers/sec-edgar-provider";
import { getTwelveDataHistoricalOhlc, getTwelveDataQuote } from "@/lib/external-data/providers/twelve-data-provider";
import { saveNewsItems } from "@/lib/db/repositories/research-store";
import type { StockResearchSnapshot } from "@/lib/external-data/types";

// getStockResearchSnapshot assembles cached quote, candles, fundamentals, and news for one ticker.
export async function getStockResearchSnapshot(tickerInput: string, options: { forceRefresh?: boolean } = {}): Promise<StockResearchSnapshot> {
  const ticker = normalizeTicker(tickerInput);
  const providerOptions = { forceRefresh: options.forceRefresh };
  const [quote, ohlc, fundamentals, news] = await Promise.all([
    getFirstResolved([() => getTwelveDataQuote(ticker, providerOptions), () => getFmpQuote(ticker, providerOptions)]),
    getFirstResolved([() => getTwelveDataHistoricalOhlc(ticker, 200, providerOptions), () => getAlphaVantageHistoricalOhlc(ticker, 200, providerOptions)]),
    getSecFundamentals(ticker, providerOptions),
    getCombinedNews(ticker, providerOptions),
  ]);

  return {
    fundamentals: fundamentals ?? undefined,
    generatedAt: new Date().toISOString(),
    news,
    ohlc: ohlc ?? undefined,
    quote: quote ?? undefined,
    refreshed: Boolean(options.forceRefresh),
    ticker,
  };
}

// getCombinedNews merges configured RSS headlines with optional FMP stock news.
async function getCombinedNews(ticker: string, options: { forceRefresh?: boolean }) {
  const results = await Promise.allSettled([getConfiguredRssNews(ticker, 10, options), getFmpStockNews(ticker, 10, options)]);
  const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set<string>();

  const dedupedItems = items.filter((item) => {
    const key = item.url || item.title;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  saveNewsItems(ticker, dedupedItems);
  return dedupedItems;
}

// getFirstResolved returns the first provider result that succeeds with non-empty data.
async function getFirstResolved<T>(loaders: Array<() => Promise<T | null>>): Promise<T | null> {
  for (const loader of loaders) {
    try {
      const result = await loader();

      if (result) {
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}

// normalizeTicker keeps orchestration requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
