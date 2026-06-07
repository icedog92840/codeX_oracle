import type { AnalyzerDataProvider, AnalyzerPayload, CompanyProfile, OhlcCandle } from "@/lib/analyzer/types";

// KnownProfiles gives common tickers friendly names while unknown symbols still work.
const knownProfiles: Record<string, Omit<CompanyProfile, "ticker">> = {
  AAPL: { companyName: "Apple", dividendYield: 0.0051 },
  AMC: { companyName: "AMC Entertainment", dividendYield: 0 },
  AMZN: { companyName: "Amazon", dividendYield: 0 },
  F: { companyName: "Ford Motor", dividendYield: 0.054 },
  JEPI: { companyName: "JPMorgan Equity Premium Income ETF", dividendYield: 0.071 },
  MSFT: { companyName: "Microsoft", dividendYield: 0.0074 },
  NVDA: { companyName: "NVIDIA", dividendYield: 0.0003 },
  QYLD: { companyName: "Global X Nasdaq 100 Covered Call ETF", dividendYield: 0.108 },
  SCHD: { companyName: "Schwab U.S. Dividend Equity ETF", dividendYield: 0.034 },
  SOFI: { companyName: "SoFi Technologies", dividendYield: 0 },
  TSLA: { companyName: "Tesla", dividendYield: 0 },
  VOO: { companyName: "Vanguard S&P 500 ETF", dividendYield: 0.012 },
  VTI: { companyName: "Vanguard Total Stock Market ETF", dividendYield: 0.013 },
};

// getMockAnalyzerPayload returns deterministic local OHLC data until a live provider is connected.
export async function getMockAnalyzerPayload(tickerInput: string): Promise<AnalyzerPayload> {
  const ticker = normalizeTicker(tickerInput);
  const profile = buildProfile(ticker);

  return {
    profile,
    candles: buildMockCandles(ticker),
    feedStatus: {
      detail: "Deterministic local OHLC fallback. Add provider keys to use cached live research candles.",
      label: "Mock OHLC",
      source: "mock",
    },
    source: "mock",
  };
}

// mockAnalyzerDataProvider exposes mock OHLC generation through the shared provider interface.
export const mockAnalyzerDataProvider: AnalyzerDataProvider = {
  getAnalyzerPayload: getMockAnalyzerPayload,
};

// normalizeTicker keeps user input safe and consistent for mock generation.
function normalizeTicker(tickerInput: string) {
  return tickerInput.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 8);
}

// buildProfile returns a known company name or a clean placeholder for unknown tickers.
function buildProfile(ticker: string): CompanyProfile {
  const knownProfile = knownProfiles[ticker];

  return {
    ticker,
    companyName: knownProfile?.companyName ?? `${ticker} Holdings`,
    dividendYield: knownProfile?.dividendYield ?? seededRange(hashTicker(ticker), 0, 0.034),
  };
}

// buildMockCandles creates 200 stable business-like daily bars from ticker-derived seeds.
function buildMockCandles(ticker: string): OhlcCandle[] {
  const seed = hashTicker(ticker);
  const candles: OhlcCandle[] = [];
  const basePrice = seededRange(seed, 18, 420);
  const drift = seededRange(seed + 13, -0.0018, 0.0028);
  const volatility = seededRange(seed + 29, 0.007, 0.028);
  let close = basePrice;

  for (let index = 199; index >= 0; index -= 1) {
    const dailyNoise = seededRange(seed + index * 37, -volatility, volatility);
    const wave = Math.sin((index + seed) / 13) * volatility * 0.55;
    const change = drift + dailyNoise + wave;
    const open = close * (1 + seededRange(seed + index * 17, -volatility * 0.4, volatility * 0.4));
    close = Math.max(1, close * (1 + change));
    const high = Math.max(open, close) * (1 + seededRange(seed + index * 19, 0.001, volatility * 0.9));
    const low = Math.min(open, close) * (1 - seededRange(seed + index * 23, 0.001, volatility * 0.9));
    const date = new Date();
    date.setDate(date.getDate() - index);

    candles.push({
      date: date.toISOString().slice(0, 10),
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.round(seededRange(seed + index * 31, 900_000, 58_000_000)),
    });
  }

  return candles;
}

// hashTicker converts a ticker into a repeatable numeric seed.
function hashTicker(ticker: string) {
  return ticker.split("").reduce((hash, character) => hash * 31 + character.charCodeAt(0), 17);
}

// seededRange produces deterministic pseudo-random values between min and max.
function seededRange(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const ratio = x - Math.floor(x);

  return min + ratio * (max - min);
}

// roundPrice keeps generated prices in normal market-display precision.
function roundPrice(value: number) {
  return Number(value.toFixed(2));
}
