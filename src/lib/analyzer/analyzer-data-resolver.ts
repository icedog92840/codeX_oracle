import { mockAnalyzerDataProvider } from "@/lib/analyzer/mock-ohlc-provider";
import { researchAnalyzerDataProvider } from "@/lib/analyzer/research-analyzer-provider";
import { analyzerDataSettings, type AnalyzerDataSettings } from "@/lib/analyzer/analyzer-data-settings";
import type { AnalyzerDataProvider } from "@/lib/analyzer/types";

// getAnalyzerDataProvider returns the configured historical OHLC provider for analyzer scans.
export function getAnalyzerDataProvider(settings: AnalyzerDataSettings = analyzerDataSettings): AnalyzerDataProvider {
  if (settings.activeSource === "mock") {
    return mockAnalyzerDataProvider;
  }

  return researchAnalyzerDataProvider;
}
