import {
  type MarketDataSnapshot,
} from "@/lib/market-data/market-data-provider";
import { getMarketDataProvider } from "@/lib/market-data/market-data-resolver";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// MarketDataPlaceholder preserves the old import name while the provider layer becomes the source of truth.
export type MarketDataPlaceholder = MarketDataSnapshot;

// buildMockMarketData keeps existing callers working by delegating through the configured provider.
export function buildMockMarketData(transactions: NormalizedTransaction[]): MarketDataSnapshot {
  return getMarketDataProvider().getMarketData(transactions);
}
