import type { NormalizedTransaction } from "@/lib/types/transactions";
import { getSqlite } from "@/lib/db/connection";

// MarketDataSource names where the current quote and dividend yield values came from.
export type MarketDataSource = "local-placeholder" | "live";

// QuoteFreshnessStatus gives the UI a compact age bucket for cached quote health.
export type QuoteFreshnessStatus = "fresh" | "good" | "aging" | "stale" | "fallback";

// QuoteFreshnessMeta explains where one displayed quote came from and how old it is.
export type QuoteFreshnessMeta = {
  ageMs: number | null;
  fetchedAt: string | null;
  expiresAt: string | null;
  provider: string;
  source: "provider-cache" | "csv-fallback";
  status: QuoteFreshnessStatus;
};

// MarketDataSnapshot is the UI-safe market data shape shared by local and future live providers.
export type MarketDataSnapshot = {
  currentPriceByTicker: Record<string, number>;
  dividendYieldByTicker: Record<string, number>;
  quoteMetaByTicker: Record<string, QuoteFreshnessMeta>;
  source: MarketDataSource;
  generatedAt: string;
};

// MarketDataProvider defines the one method any market data source must implement.
export type MarketDataProvider = {
  getMarketData(transactions: NormalizedTransaction[]): MarketDataSnapshot;
};

// localPlaceholderMarketDataProvider keeps the app fully local while matching the future live-provider contract.
export const localPlaceholderMarketDataProvider: MarketDataProvider = {
  getMarketData(transactions) {
    return {
      // TODO: Fetch Live Stock Price
      currentPriceByTicker: buildLatestKnownPriceByTicker(transactions),
      // TODO: Fetch Live Dividend Yield
      dividendYieldByTicker: buildEstimatedDividendYieldByTicker(transactions),
      quoteMetaByTicker: buildFallbackQuoteMetaByTicker(transactions),
      source: "local-placeholder",
      generatedAt: new Date().toISOString(),
    };
  },
};

// cachedLiveMarketDataProvider reuses research quote cache first and falls back to local placeholders.
export const cachedLiveMarketDataProvider: MarketDataProvider = {
  getMarketData(transactions) {
    const placeholder = localPlaceholderMarketDataProvider.getMarketData(transactions);
    const tickers = getUniqueTickers(transactions);
    const cachedQuotes = readCachedQuotePrices(tickers);
    const cachedPrices = Object.fromEntries(Array.from(cachedQuotes.entries()).map(([ticker, quote]) => [ticker, quote.price]));

    return {
      currentPriceByTicker: {
        ...placeholder.currentPriceByTicker,
        ...cachedPrices,
      },
      // TODO: Fetch Live Dividend Yield
      dividendYieldByTicker: placeholder.dividendYieldByTicker,
      quoteMetaByTicker: {
        ...placeholder.quoteMetaByTicker,
        ...Object.fromEntries(Array.from(cachedQuotes.entries()).map(([ticker, quote]) => [ticker, quote.meta])),
      },
      source: Object.keys(cachedPrices).length > 0 ? "live" : "local-placeholder",
      generatedAt: new Date().toISOString(),
    };
  },
};

// buildLatestKnownPriceByTicker uses the latest transaction price as a local placeholder quote.
function buildLatestKnownPriceByTicker(transactions: NormalizedTransaction[]) {
  return transactions.reduce<Record<string, number>>((prices, transaction) => {
    if (!transaction.ticker || transaction.price === null || transaction.price <= 0) {
      return prices;
    }

    prices[transaction.ticker] = transaction.price;
    return prices;
  }, {});
}

// readCachedQuotePrices pulls already-fetched provider quotes from SQLite without making API calls.
function readCachedQuotePrices(tickers: string[]) {
  if (tickers.length === 0) {
    return new Map<string, { meta: QuoteFreshnessMeta; price: number }>();
  }

  try {
    const rows = getSqlite()
      .prepare("SELECT provider, data_json AS dataJson, cache_key AS cacheKey, fetched_at AS fetchedAt, expires_at AS expiresAt FROM provider_cache WHERE cache_key LIKE '%quote%'")
      .all() as Array<{ cacheKey: string; dataJson: string; expiresAt: string | null; fetchedAt: string; provider: string }>;
    const tickerSet = new Set(tickers);
    const quotes = new Map<string, { fetchedAt: string; meta: QuoteFreshnessMeta; price: number; provider: string }>();
    const now = new Date();

    rows.forEach((row) => {
      parseCachedQuotes(row).forEach((quote) => {
        if (!tickerSet.has(quote.ticker)) {
          return;
        }

        const existing = quotes.get(quote.ticker);
        const quoteWithMeta = {
          ...quote,
          meta: buildCachedQuoteMeta(quote, now),
        };

        if (!existing || compareQuotePreference(quoteWithMeta, existing) > 0) {
          quotes.set(quote.ticker, quoteWithMeta);
        }
      });
    });

    return quotes;
  } catch {
    return new Map<string, { meta: QuoteFreshnessMeta; price: number }>();
  }
}

// parseCachedQuotes normalizes raw Twelve Data, FMP single quote, and FMP batch quote cache payloads.
function parseCachedQuotes(row: { dataJson: string; expiresAt: string | null; fetchedAt: string; provider: string }) {
  try {
    const data = JSON.parse(row.dataJson) as unknown;
    const quoteRows = (Array.isArray(data) ? data : [data]) as Array<{ close?: string; price?: number; symbol?: string } | undefined>;

    return quoteRows.flatMap((quote) => {
      const price = typeof quote?.price === "number" ? quote.price : Number(quote?.close ?? 0);
      const ticker = quote?.symbol?.trim().toUpperCase();

      if (!ticker || !Number.isFinite(price) || price <= 0) {
        return [];
      }

      return {
        expiresAt: row.expiresAt,
        fetchedAt: row.fetchedAt,
        price,
        provider: row.provider,
        ticker,
      };
    });
  } catch {
    return [];
  }
}

// buildCachedQuoteMeta turns cache timestamps into a plain-English freshness bucket.
function buildCachedQuoteMeta(
  quote: { expiresAt: string | null; fetchedAt: string; provider: string },
  now: Date,
): QuoteFreshnessMeta {
  const fetchedAtTime = Date.parse(quote.fetchedAt);
  const ageMs = Number.isFinite(fetchedAtTime) ? Math.max(now.getTime() - fetchedAtTime, 0) : null;

  return {
    ageMs,
    expiresAt: quote.expiresAt,
    fetchedAt: quote.fetchedAt,
    provider: quote.provider,
    source: "provider-cache",
    status: getQuoteFreshnessStatus(ageMs),
  };
}

// buildFallbackQuoteMetaByTicker marks CSV-derived prices so they are visibly different from cached provider prices.
function buildFallbackQuoteMetaByTicker(transactions: NormalizedTransaction[]) {
  return getUniqueTickers(transactions).reduce<Record<string, QuoteFreshnessMeta>>((metaByTicker, ticker) => {
    metaByTicker[ticker] = {
      ageMs: null,
      expiresAt: null,
      fetchedAt: null,
      provider: "CSV fallback",
      source: "csv-fallback",
      status: "fallback",
    };

    return metaByTicker;
  }, {});
}

// getQuoteFreshnessStatus buckets quote age so the UI can render a subtle freshness ring.
function getQuoteFreshnessStatus(ageMs: number | null): QuoteFreshnessStatus {
  if (ageMs === null) {
    return "fallback";
  }

  const hours = ageMs / (1000 * 60 * 60);

  if (hours <= 4) {
    return "fresh";
  }

  if (hours <= 8) {
    return "good";
  }

  if (hours <= 12) {
    return "aging";
  }

  return "stale";
}

// compareQuotePreference prefers Twelve Data, then newest cached quote data.
function compareQuotePreference(
  next: { fetchedAt: string; provider: string },
  existing: { fetchedAt: string; provider: string },
) {
  const providerScore = (provider: string) => provider === "twelve-data" ? 2 : provider === "fmp" ? 1 : 0;
  const providerDifference = providerScore(next.provider) - providerScore(existing.provider);

  if (providerDifference !== 0) {
    return providerDifference;
  }

  return next.fetchedAt.localeCompare(existing.fetchedAt);
}

// getUniqueTickers returns every ticker seen in the CSV once.
function getUniqueTickers(transactions: NormalizedTransaction[]) {
  return Array.from(new Set(transactions.map((transaction) => transaction.ticker).filter((ticker): ticker is string => Boolean(ticker))));
}

// buildEstimatedDividendYieldByTicker derives static trailing dividend dollars from recent local dividends.
function buildEstimatedDividendYieldByTicker(transactions: NormalizedTransaction[]) {
  const latestDate = transactions.reduce<Date | null>((latest, transaction) => {
    if (!latest || transaction.date > latest) {
      return transaction.date;
    }

    return latest;
  }, null);

  if (!latestDate) {
    return {};
  }

  const trailingStart = new Date(latestDate);
  trailingStart.setFullYear(trailingStart.getFullYear() - 1);

  return transactions.reduce<Record<string, number>>((yields, transaction) => {
    if (transaction.transCode !== "CDIV" || !transaction.ticker || transaction.amount === null) {
      return yields;
    }

    if (transaction.date < trailingStart) {
      return yields;
    }

    yields[transaction.ticker] = (yields[transaction.ticker] ?? 0) + Math.max(transaction.amount, 0);
    return yields;
  }, {});
}
