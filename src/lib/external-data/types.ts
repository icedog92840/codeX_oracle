import type { OhlcCandle } from "@/lib/analyzer/types";

// ExternalDataSource names third-party or public-data sources used outside the Robinhood CSV.
export type ExternalDataSource = "twelve-data" | "sec-edgar" | "alpha-vantage" | "fmp" | "rss-news";

// CachedResponse wraps provider data with cache metadata so callers can explain freshness.
export type CachedResponse<T> = {
  data: T;
  fetchedAt: string;
  expiresAt: string;
  provider: ExternalDataSource;
  cacheKey: string;
};

// SourceFreshness explains when one cached provider response was fetched and when it expires.
export type SourceFreshness = {
  cacheKey: string;
  expiresAt: string;
  fetchedAt: string;
  isStale: boolean;
  source: ExternalDataSource;
};

// ProviderAvailability reports whether a provider can be called with the current local env.
export type ProviderAvailability = {
  enabled: boolean;
  missingEnv: string[];
  provider: ExternalDataSource;
};

// LiveQuote stores current or delayed market quote fields from a market-data provider.
export type LiveQuote = {
  ticker: string;
  price: number;
  currency?: string;
  freshness?: SourceFreshness;
  name?: string;
  percentChange?: number;
  source: ExternalDataSource;
};

// HistoricalOhlc stores daily candles for analyzer calculations.
export type HistoricalOhlc = {
  ticker: string;
  candles: OhlcCandle[];
  freshness?: SourceFreshness;
  source: ExternalDataSource;
};

// FundamentalSnapshot stores value-investor metrics derived from public filings or fundamentals APIs.
export type FundamentalSnapshot = {
  ticker: string;
  currentAssets?: number;
  currentLiabilities?: number;
  grossProfit?: number;
  revenue?: number;
  revenueGrowth?: number;
  netIncome?: number;
  operatingIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  shareholderEquity?: number;
  longTermDebt?: number;
  operatingCashFlow?: number;
  capitalExpenditures?: number;
  freeCashFlow?: number;
  sharesOutstanding?: number;
  bookValuePerShare?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  freshness?: SourceFreshness;
  source: ExternalDataSource;
};

// StockNewsItem stores one relevant headline for watchlist and scan snapshot views.
export type StockNewsItem = {
  title: string;
  url: string;
  publishedAt?: string;
  freshness?: SourceFreshness;
  sourceName?: string;
  summary?: string;
  source: ExternalDataSource;
};

// StockResearchSnapshot combines the data a richer analyzer can use for one ticker.
export type StockResearchSnapshot = {
  ticker: string;
  quote?: LiveQuote;
  ohlc?: HistoricalOhlc;
  fundamentals?: FundamentalSnapshot;
  news: StockNewsItem[];
  generatedAt: string;
  refreshed: boolean;
};
