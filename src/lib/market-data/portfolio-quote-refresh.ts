import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPortfolioHoldings } from "@/lib/calculations/portfolio";
import { getFmpBatchQuotes, getFmpQuote } from "@/lib/external-data/providers/fmp-provider";
import { getTwelveDataQuote } from "@/lib/external-data/providers/twelve-data-provider";
import { localPlaceholderMarketDataProvider } from "@/lib/market-data/market-data-provider";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { LiveQuote } from "@/lib/external-data/types";

// PortfolioQuoteRefreshResult summarizes one manual portfolio-wide quote refresh.
export type PortfolioQuoteRefreshResult = {
  attempted: number;
  errors: string[];
  generatedAt: string;
  providers: string[];
  refreshed: number;
  skipped: string[];
  tickers: string[];
};

// refreshPortfolioQuotes updates quote cache for all open holdings without running deep Analyzer research.
export async function refreshPortfolioQuotes(options: { forceRefresh?: boolean } = {}): Promise<PortfolioQuoteRefreshResult> {
  const tickers = getOpenHoldingTickers();
  const refreshedQuotes = new Map<string, LiveQuote>();
  const errors: string[] = [];
  let canUseFmpSingleFallback = true;

  try {
    const fmpQuotes = await getFmpBatchQuotes(tickers, { forceRefresh: options.forceRefresh });

    fmpQuotes.forEach((quote) => refreshedQuotes.set(quote.ticker.toUpperCase(), quote));
  } catch (error) {
    errors.push(formatProviderError("FMP batch quote", error));
    canUseFmpSingleFallback = !String(error).includes("402");
  }

  if (canUseFmpSingleFallback) {
    for (const ticker of tickers.filter((symbol) => !refreshedQuotes.has(symbol))) {
      try {
        const quote = await getFmpQuote(ticker, { forceRefresh: options.forceRefresh });

        if (quote) {
          refreshedQuotes.set(ticker, quote);
        }
      } catch (error) {
        errors.push(formatProviderError(`FMP ${ticker}`, error));

        if (String(error).toLowerCase().includes("budget reached")) {
          break;
        }
      }
    }
  }

  for (const ticker of tickers.filter((symbol) => !refreshedQuotes.has(symbol))) {
    try {
      const quote = await getTwelveDataQuote(ticker, { forceRefresh: options.forceRefresh });

      if (quote) {
        refreshedQuotes.set(ticker, quote);
      }
    } catch (error) {
      errors.push(formatProviderError(`Twelve Data ${ticker}`, error));

      if (String(error).toLowerCase().includes("budget reached")) {
        break;
      }
    }
  }

  const providers = Array.from(new Set(Array.from(refreshedQuotes.values()).map((quote) => quote.source)));
  const refreshed = Array.from(refreshedQuotes.keys()).sort();

  return {
    attempted: tickers.length,
    errors,
    generatedAt: new Date().toISOString(),
    providers,
    refreshed: refreshed.length,
    skipped: tickers.filter((ticker) => !refreshedQuotes.has(ticker)),
    tickers,
  };
}

// getOpenHoldingTickers reads the CSV and derives the current open holding tickers.
function getOpenHoldingTickers() {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const placeholderMarketData = localPlaceholderMarketDataProvider.getMarketData(transactions);

  return buildPortfolioHoldings(transactions, placeholderMarketData).map((holding) => holding.ticker).sort();
}

// formatProviderError keeps API/key/budget errors readable without exposing secrets.
function formatProviderError(label: string, error: unknown) {
  return `${label}: ${error instanceof Error ? error.message : "Unavailable"}`;
}
