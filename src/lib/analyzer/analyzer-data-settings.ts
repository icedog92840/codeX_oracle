// AnalyzerDataSettings stores the active historical-candle provider choice.
export type AnalyzerDataSettings = {
  activeSource: "mock" | "research";
  candleLookbackDays: number;
  liveProviderName: string;
};

// analyzerDataSettings prefers cached research candles but falls back to mock when providers are missing.
export const analyzerDataSettings: AnalyzerDataSettings = {
  activeSource: "research",
  candleLookbackDays: 200,
  liveProviderName: "research-cache",
};
