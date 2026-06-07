import { mockAnalyzerDataProvider } from "@/lib/analyzer/mock-ohlc-provider";
import { analyzerDataSettings, type AnalyzerDataSettings } from "@/lib/analyzer/analyzer-data-settings";
import type { AnalyzerDataProvider } from "@/lib/analyzer/types";

// getAnalyzerDataProvider returns the configured historical OHLC provider for analyzer scans.
export function getAnalyzerDataProvider(settings: AnalyzerDataSettings = analyzerDataSettings): AnalyzerDataProvider {
  if (settings.activeSource === "mock") {
    return mockAnalyzerDataProvider;
  }

  return liveAnalyzerDataProviderPlaceholder;
}

// liveAnalyzerDataProviderPlaceholder marks the future live-candle extension point without faking live data.
const liveAnalyzerDataProviderPlaceholder: AnalyzerDataProvider = {
  getAnalyzerPayload() {
    throw new Error("Live analyzer OHLC provider is not configured. Set up a live provider before selecting activeSource='live'.");
  },
};
