import type { NormalizedTransaction } from "@/lib/types/transactions";
import { getSqlite } from "@/lib/db/connection";

// MarketDataSource names where the current quote and dividend yield values came from.
export type MarketDataSource = "local-placeholder" | "live";

// MarketDataSnapshot is the UI-safe market data shape shared by local and future live providers.
export type MarketDataSnapshot = {
  currentPriceByTicker: Record<string, number>;
  dividendYieldByTicker: Record<string, number>;
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
      source: "local-placeholder",
      generatedAt: new Date().toISOString(),
    };
  },
};

// cachedLiveMarketDataProvider reuses research quote cache first and falls back to local placeholders.
export const cachedLiveMarketDataProvider: MarketDataProvider = {
  getMarketData(transactions) {
    const placeholder = localPlaceholderMarketDataProvider.getMarketData(transactions);
    const cachedPrices = readCachedQuotePrices(getUniqueTickers(transactions));

    return {
      currentPriceByTicker: {
        ...placeholder.currentPriceByTicker,
        ...cachedPrices,
      },
      // TODO: Fetch Live Dividend Yield
      dividendYieldByTicker: placeholder.dividendYieldByTicker,
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
    return {};
  }

  try {
    const rows = getSqlite()
      .prepare("SELECT provider, data_json AS dataJson, cache_key AS cacheKey, fetched_at AS fetchedAt FROM provider_cache WHERE cache_key LIKE '%:quote:%'")
      .all() as Array<{ cacheKey: string; dataJson: string; fetchedAt: string; provider: string }>;
    const tickerSet = new Set(tickers);
    const quotes = new Map<string, { fetchedAt: string; price: number; provider: string }>();

    rows.forEach((row) => {
      const quote = parseCachedQuote(row);

      if (!quote || !tickerSet.has(quote.ticker)) {
        return;
      }

      const existing = quotes.get(quote.ticker);

      if (!existing || compareQuotePreference(quote, existing) > 0) {
        quotes.set(quote.ticker, quote);
      }
    });

    return Object.fromEntries(Array.from(quotes.entries()).map(([ticker, quote]) => [ticker, quote.price]));
  } catch {
    return {};
  }
}

// parseCachedQuote normalizes raw Twelve Data and FMP quote cache payloads into one shape.
function parseCachedQuote(row: { dataJson: string; fetchedAt: string; provider: string }) {
  try {
    const data = JSON.parse(row.dataJson) as unknown;
    const quote = (Array.isArray(data) ? data[0] : data) as { close?: string; price?: number; symbol?: string } | undefined;
    const price = typeof quote?.price === "number" ? quote.price : Number(quote?.close ?? 0);
    const ticker = quote?.symbol?.trim().toUpperCase();

    if (!ticker || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    return {
      fetchedAt: row.fetchedAt,
      price,
      provider: row.provider,
      ticker,
    };
  } catch {
    return null;
  }
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
