import type { MacdResult } from "@/lib/analyzer/types";

// buildTechnicalSummary turns numeric indicators into a short rule-based paragraph.
export function buildTechnicalSummary({
  ticker,
  price,
  sma50,
  sma200,
  support20,
  resistance20,
  rsi14,
  macd,
}: {
  ticker: string;
  price: number;
  sma50: number;
  sma200: number;
  support20: number;
  resistance20: number;
  rsi14: number;
  macd: MacdResult;
}) {
  const trendSentence = buildTrendSentence(ticker, price, sma50, sma200);
  const momentumSentence = buildMomentumSentence(rsi14, macd);
  const rangeSentence = buildRangeSentence(price, support20, resistance20);

  return `${trendSentence} ${momentumSentence} ${rangeSentence}`;
}

// buildTrendSentence explains price position versus the 50-day and 200-day moving averages.
function buildTrendSentence(ticker: string, price: number, sma50: number, sma200: number) {
  if (price > sma50 && price > sma200 && sma50 > sma200) {
    return `${ticker} is trading above both major moving averages, and the 50-day average is above the 200-day average, giving the setup a constructive trend bias.`;
  }

  if (price > sma50 && price > sma200) {
    return `${ticker} is trading above its 50-day and 200-day averages, but the longer moving-average structure is still mixed.`;
  }

  if (price < sma50 && price < sma200) {
    return `${ticker} is trading below both major moving averages, so the current setup has a defensive trend profile.`;
  }

  return `${ticker} is trading between its 50-day and 200-day averages, which points to a mixed trend setup.`;
}

// buildMomentumSentence explains RSI and MACD momentum without using buy or sell language.
function buildMomentumSentence(rsi: number, macd: MacdResult) {
  const macdPhrase = macd.histogram >= 0 ? "MACD is confirming positive short-term momentum" : "MACD is cooling versus its signal line";

  if (rsi > 70) {
    return `RSI is elevated at ${rsi.toFixed(1)}, suggesting momentum is stretched while ${macdPhrase.toLowerCase()}.`;
  }

  if (rsi < 35) {
    return `RSI is low at ${rsi.toFixed(1)}, suggesting the stock is washed out while ${macdPhrase.toLowerCase()}.`;
  }

  return `RSI is stable at ${rsi.toFixed(1)}, so momentum is not currently stretched, and ${macdPhrase.toLowerCase()}.`;
}

// buildRangeSentence explains where price sits between support and resistance.
function buildRangeSentence(price: number, support: number, resistance: number) {
  const supportDistance = ((price - support) / Math.max(price, 1)) * 100;
  const resistanceDistance = ((resistance - price) / Math.max(price, 1)) * 100;

  if (supportDistance <= 3) {
    return `Price is only ${supportDistance.toFixed(1)}% above 20-day support, so the setup is close to a defined risk zone.`;
  }

  if (resistanceDistance <= 3) {
    return `Price is within ${resistanceDistance.toFixed(1)}% of 20-day resistance, so upside room is currently more compressed.`;
  }

  return `Price is ${supportDistance.toFixed(1)}% above support and ${resistanceDistance.toFixed(1)}% below resistance, leaving the setup in the middle of its recent range.`;
}
