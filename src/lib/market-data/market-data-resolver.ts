import { marketDataSettings, type MarketDataSettings } from "@/lib/market-data/market-data-settings";
import { cachedLiveMarketDataProvider, localPlaceholderMarketDataProvider, type MarketDataProvider } from "@/lib/market-data/market-data-provider";

// getMarketDataProvider returns the configured quote/yield provider for server-side data builders.
export function getMarketDataProvider(settings: MarketDataSettings = marketDataSettings): MarketDataProvider {
  if (settings.activeSource === "local-placeholder") {
    return localPlaceholderMarketDataProvider;
  }

  return cachedLiveMarketDataProvider;
}
