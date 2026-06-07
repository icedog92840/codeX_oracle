import type { AnalyzerDataSource, AnalyzerScan, MacdResult, OhlcCandle, ScoreBreakdown } from "@/lib/analyzer/types";
import { calculateMacd, calculateResistance, calculateRsi, calculateSma, calculateSupport } from "@/lib/analyzer/technical-indicators";
import { buildTechnicalSummary } from "@/lib/analyzer/technical-summary";
import { buildValueScorecard } from "@/lib/analyzer/value-score";
import type { FundamentalSnapshot } from "@/lib/external-data/types";

// buildAnalyzerScan turns OHLC data and profile fields into one complete technical snapshot.
export function buildAnalyzerScan({
  ticker,
  companyName,
  dividendYield,
  fundamentals,
  source,
  candles,
}: {
  ticker: string;
  companyName: string;
  dividendYield: number;
  fundamentals?: FundamentalSnapshot;
  source: AnalyzerDataSource;
  candles: OhlcCandle[];
}): AnalyzerScan {
  const price = candles.at(-1)?.close ?? 0;
  const sma50 = calculateSma(candles, 50);
  const sma200 = calculateSma(candles, 200);
  const support20 = calculateSupport(candles, 20);
  const resistance20 = calculateResistance(candles, 20);
  const rsi14 = calculateRsi(candles, 14);
  const macd = calculateMacd(candles);
  const scoreBreakdown = buildScoreBreakdown({ price, sma50, sma200, support20, resistance20, rsi14, macd });
  const score = Math.min(100, Math.round(scoreBreakdown.trend + scoreBreakdown.momentum + scoreBreakdown.support + scoreBreakdown.macd));
  const grade = scoreToGrade(score);
  const signals = buildSignals({ price, sma50, sma200, support20, resistance20, rsi14, macd });
  const summary = buildTechnicalSummary({ ticker, price, sma50, sma200, support20, resistance20, rsi14, macd });
  const valueScorecard = buildValueScorecard({ candles, dividendYield, fundamentals, price, technicalScore: score, ticker });

  return {
    id: `${ticker}-${Date.now()}`,
    ticker,
    companyName,
    scannedAt: new Date().toISOString(),
    source,
    price,
    dividendYield,
    support20,
    resistance20,
    rsi14,
    macd: macd.macd,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    sma50,
    sma200,
    score,
    grade,
    valueScorecard,
    summary,
    signals,
    scoreBreakdown,
    candles,
  };
}

// buildScoreBreakdown assigns transparent points to trend, momentum, support, and MACD.
function buildScoreBreakdown({
  price,
  sma50,
  sma200,
  support20,
  resistance20,
  rsi14,
  macd,
}: {
  price: number;
  sma50: number;
  sma200: number;
  support20: number;
  resistance20: number;
  rsi14: number;
  macd: MacdResult;
}): ScoreBreakdown {
  const trend = (price > sma50 ? 15 : 0) + (price > sma200 ? 15 : 0) + (sma50 > sma200 ? 10 : 0);
  const momentum = scoreMomentum(rsi14);
  const support = scoreSupportProximity(price, support20, resistance20);
  const macdScore = (macd.macd > macd.signal ? 10 : 0) + (macd.histogram > 0 ? 5 : 0);

  return {
    trend,
    momentum,
    support,
    macd: macdScore,
  };
}

// scoreMomentum favors stable RSI readings and penalizes stretched conditions.
function scoreMomentum(rsi: number) {
  if (rsi >= 45 && rsi <= 65) {
    return 25;
  }

  if ((rsi >= 35 && rsi < 45) || (rsi > 65 && rsi <= 75)) {
    return 15;
  }

  if (rsi < 35) {
    return 10;
  }

  return 5;
}

// scoreSupportProximity rewards setups with nearby support and room before resistance.
function scoreSupportProximity(price: number, support: number, resistance: number) {
  const range = Math.max(resistance - support, 1);
  const position = (price - support) / range;

  if (position >= 0.12 && position <= 0.45) {
    return 20;
  }

  if (position > 0.45 && position <= 0.72) {
    return 14;
  }

  if (position < 0.12) {
    return 12;
  }

  return 6;
}

// buildSignals creates short chips that summarize the most important technical facts.
function buildSignals({
  price,
  sma50,
  sma200,
  support20,
  resistance20,
  rsi14,
  macd,
}: {
  price: number;
  sma50: number;
  sma200: number;
  support20: number;
  resistance20: number;
  rsi14: number;
  macd: MacdResult;
}) {
  const range = Math.max(resistance20 - support20, 1);
  const distanceFromSupport = (price - support20) / range;

  return [
    price > sma50 ? "Above 50 SMA" : "Below 50 SMA",
    price > sma200 ? "Above 200 SMA" : "Below 200 SMA",
    sma50 > sma200 ? "Golden trend bias" : "Long trend lagging",
    rsi14 > 70 ? "RSI stretched" : rsi14 < 35 ? "RSI washed out" : "RSI stable",
    distanceFromSupport < 0.35 ? "Near support" : "Mid-range setup",
    macd.histogram > 0 ? "MACD positive" : "MACD cooling",
  ];
}

// scoreToGrade maps the numeric score to a simple A-F technical grade.
function scoreToGrade(score: number): AnalyzerScan["grade"] {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  if (score >= 60) {
    return "D";
  }

  return "F";
}
