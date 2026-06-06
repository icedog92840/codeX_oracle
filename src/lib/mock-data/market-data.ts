import {
  localPlaceholderMarketDataProvider,
  type MarketDataSnapshot,
} from "@/lib/market-data/market-data-provider";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// MarketDataPlaceholder preserves the old import name while the provider layer becomes the source of truth.
export type MarketDataPlaceholder = MarketDataSnapshot;

// buildMockMarketData keeps existing callers working by delegating to the local provider.
export function buildMockMarketData(transactions: NormalizedTransaction[]): MarketDataSnapshot {
  return localPlaceholderMarketDataProvider.getMarketData(transactions);
}
