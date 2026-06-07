// OhlcCandle stores one daily open-high-low-close bar for local technical calculations.
export type OhlcCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

// CompanyProfile stores static profile fields used by the analyzer header.
export type CompanyProfile = {
  ticker: string;
  companyName: string;
  dividendYield: number;
};

// AnalyzerPayload stores the local data provider response for one ticker.
export type AnalyzerPayload = {
  profile: CompanyProfile;
  candles: OhlcCandle[];
  source: "mock";
};

// MacdResult stores the final MACD values from the local EMA calculation.
export type MacdResult = {
  macd: number;
  signal: number;
  histogram: number;
};

// ScoreBreakdown stores point buckets so the technical score is explainable.
export type ScoreBreakdown = {
  trend: number;
  momentum: number;
  support: number;
  macd: number;
};

// AnalyzerScan stores a complete analyzed result that can be saved locally.
export type AnalyzerScan = {
  id: string;
  ticker: string;
  companyName: string;
  scannedAt: string;
  source: "mock";
  price: number;
  dividendYield: number;
  support20: number;
  resistance20: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma50: number;
  sma200: number;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  signals: string[];
  scoreBreakdown: ScoreBreakdown;
  candles: OhlcCandle[];
};

// WatchlistItem stores the user's locally saved analyzer tickers with the latest scan snapshot.
export type WatchlistItem = {
  ticker: string;
  companyName: string;
  addedAt: string;
  lastScannedAt: string;
  latestScanId: string;
  price: number;
  dividendYield: number;
  score: number;
  grade: AnalyzerScan["grade"];
  source: AnalyzerScan["source"];
};
