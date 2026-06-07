import type { AnalyzerDataSource } from "@/lib/analyzer/types";

// AnalyzerDataSettings stores the active historical-candle provider choice.
export type AnalyzerDataSettings = {
  activeSource: AnalyzerDataSource;
  candleLookbackDays: number;
  liveProviderName: string;
};

// analyzerDataSettings keeps analyzer scans local until a live OHLC provider is intentionally connected.
export const analyzerDataSettings: AnalyzerDataSettings = {
  activeSource: "mock",
  candleLookbackDays: 200,
  liveProviderName: "not-configured",
};
