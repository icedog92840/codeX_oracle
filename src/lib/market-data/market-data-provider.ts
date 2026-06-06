import type { NormalizedTransaction } from "@/lib/types/transactions";

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
