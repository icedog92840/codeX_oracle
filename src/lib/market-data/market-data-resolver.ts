import { marketDataSettings, type MarketDataSettings } from "@/lib/market-data/market-data-settings";
import { localPlaceholderMarketDataProvider, type MarketDataProvider } from "@/lib/market-data/market-data-provider";

// getMarketDataProvider returns the configured quote/yield provider for server-side data builders.
export function getMarketDataProvider(settings: MarketDataSettings = marketDataSettings): MarketDataProvider {
  if (settings.activeSource === "local-placeholder") {
    return localPlaceholderMarketDataProvider;
  }

  return liveMarketDataProviderPlaceholder;
}

// liveMarketDataProviderPlaceholder marks the future extension point without pretending live data exists today.
const liveMarketDataProviderPlaceholder: MarketDataProvider = {
  getMarketData() {
    throw new Error("Live market data provider is not configured. Set up a live provider before selecting activeSource='live'.");
  },
};
