import type { MarketDataSource } from "@/lib/market-data/market-data-provider";

// MarketDataSettings stores the active provider choice and future live-data configuration.
export type MarketDataSettings = {
  activeSource: MarketDataSource;
  liveProviderName: string;
};

// marketDataSettings keeps the app local-first until a live quote provider is intentionally connected.
export const marketDataSettings: MarketDataSettings = {
  activeSource: "local-placeholder",
  liveProviderName: "not-configured",
};
