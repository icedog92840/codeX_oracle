import { getMockAnalyzerPayload } from "@/lib/analyzer/mock-ohlc-provider";
import type { AnalyzerDataProvider, AnalyzerPayload, OhlcCandle } from "@/lib/analyzer/types";
import type { StockResearchSnapshot } from "@/lib/external-data/types";

// researchAnalyzerDataProvider prefers cached provider research data and falls back to mock OHLC.
export const researchAnalyzerDataProvider: AnalyzerDataProvider = {
  async getAnalyzerPayload(tickerInput: string): Promise<AnalyzerPayload> {
    const ticker = normalizeTicker(tickerInput);
    const research = await fetchResearchSnapshot(ticker);

    if (!research?.ohlc?.candles.length) {
      const fallback = await getMockAnalyzerPayload(ticker);

      return {
        ...fallback,
        feedStatus: {
          detail: "No provider OHLC candles were available, so the analyzer used deterministic local mock candles.",
          label: "Mock fallback",
          source: "mock",
        },
      };
    }

    const candles = sanitizeCandles(research.ohlc.candles);

    if (candles.length < 50) {
      const fallback = await getMockAnalyzerPayload(ticker);

      return {
        ...fallback,
        feedStatus: {
          detail: `Provider ${research.ohlc.source} returned fewer than 50 usable candles, so the analyzer used deterministic local mock candles.`,
          label: "Mock fallback",
          source: "mock",
        },
      };
    }

    return {
      candles,
      feedStatus: {
        detail: `Analyzer candles came from ${research.ohlc.source} through the cached /api/research route.`,
        freshness: research.ohlc.freshness ? {
          expiresAt: research.ohlc.freshness.expiresAt,
          fetchedAt: research.ohlc.freshness.fetchedAt,
          isStale: research.ohlc.freshness.isStale,
        } : undefined,
        label: "Provider OHLC",
        provider: research.ohlc.source,
        source: "provider",
      },
      profile: {
        companyName: research.quote?.name ?? `${ticker} Holdings`,
        dividendYield: 0,
        ticker: research.quote?.ticker ?? ticker,
      },
      source: "live",
    };
  },
};

// fetchResearchSnapshot reads the server-only research route without exposing provider keys.
async function fetchResearchSnapshot(ticker: string): Promise<StockResearchSnapshot | null> {
  try {
    const response = await fetch(`/api/research/${encodeURIComponent(ticker)}`);

    if (!response.ok) {
      return null;
    }

    return await response.json() as StockResearchSnapshot;
  } catch {
    return null;
  }
}

// sanitizeCandles removes malformed provider rows before local technical calculations run.
function sanitizeCandles(candles: OhlcCandle[]) {
  return candles.filter((candle) => (
    candle.date &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0
  ));
}

// normalizeTicker keeps client-side research requests consistent and safe.
function normalizeTicker(tickerInput: string) {
  return tickerInput.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
