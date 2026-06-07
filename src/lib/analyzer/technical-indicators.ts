import type { MacdResult, OhlcCandle } from "@/lib/analyzer/types";

// calculateSma averages the latest close prices over the requested period.
export function calculateSma(candles: OhlcCandle[], period: number) {
  const closes = candles.slice(-period).map((candle) => candle.close);

  if (closes.length === 0) {
    return 0;
  }

  return closes.reduce((total, close) => total + close, 0) / closes.length;
}

// calculateSupport finds the lowest low over the lookback window.
export function calculateSupport(candles: OhlcCandle[], lookback = 20) {
  return Math.min(...candles.slice(-lookback).map((candle) => candle.low));
}

// calculateResistance finds the highest high over the lookback window.
export function calculateResistance(candles: OhlcCandle[], lookback = 20) {
  return Math.max(...candles.slice(-lookback).map((candle) => candle.high));
}

// calculateRsi computes a simple 14-period RSI from close-to-close changes.
export function calculateRsi(candles: OhlcCandle[], period = 14) {
  const closes = candles.map((candle) => candle.close);
  const window = closes.slice(-(period + 1));

  if (window.length < 2) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index < window.length; index += 1) {
    const change = window[index] - window[index - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

// calculateMacd computes 12/26 EMA MACD with a 9-period signal line.
export function calculateMacd(candles: OhlcCandle[]): MacdResult {
  const closes = candles.map((candle) => candle.close);
  const ema12 = calculateEmaSeries(closes, 12);
  const ema26 = calculateEmaSeries(closes, 26);
  const macdSeries = ema12.map((value, index) => value - ema26[index]);
  const signalSeries = calculateEmaSeries(macdSeries, 9);
  const macd = macdSeries.at(-1) ?? 0;
  const signal = signalSeries.at(-1) ?? 0;

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

// calculateEmaSeries returns an exponential moving average for every input value.
function calculateEmaSeries(values: number[], period: number) {
  const smoothing = 2 / (period + 1);
  const series: number[] = [];

  values.forEach((value, index) => {
    if (index === 0) {
      series.push(value);
      return;
    }

    series.push(value * smoothing + series[index - 1] * (1 - smoothing));
  });

  return series;
}
