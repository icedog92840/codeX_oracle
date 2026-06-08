import type { MarketDataSource } from "@/lib/market-data/market-data-provider";

// MarketDataSettings stores the active provider choice and future live-data configuration.
export type MarketDataSettings = {
  activeSource: MarketDataSource;
  liveProviderName: string;
};

// marketDataSettings reuses cached research quotes first while preserving local CSV fallbacks.
export const marketDataSettings: MarketDataSettings = {
  activeSource: "live",
  liveProviderName: "research-quote-cache",
};
