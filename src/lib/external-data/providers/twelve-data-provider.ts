import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
import type { HistoricalOhlc, LiveQuote } from "@/lib/external-data/types";

// TwelveDataTimeSeriesResponse matches the fields used from Twelve Data's time_series endpoint.
type TwelveDataTimeSeriesResponse = {
  values?: Array<{
    close: string;
    datetime: string;
    high: string;
    low: string;
    open: string;
    volume?: string;
  }>;
};

// TwelveDataQuoteResponse matches the fields used from Twelve Data's quote endpoint.
type TwelveDataQuoteResponse = {
  close?: string;
  currency?: string;
  name?: string;
  percent_change?: string;
  symbol?: string;
};

// getTwelveDataHistoricalOhlc returns daily candles when TWELVE_DATA_API_KEY is configured.
export async function getTwelveDataHistoricalOhlc(ticker: string, outputSize = 200): Promise<HistoricalOhlc | null> {
  const availability = getProviderAvailability("twelve-data");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("apikey", process.env.TWELVE_DATA_API_KEY ?? "");
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputSize));
  url.searchParams.set("symbol", symbol);

  const response = await fetchJsonWithCache<TwelveDataTimeSeriesResponse>({
    budget: freeApiBudgets.twelveData,
    cacheParts: { outputSize, symbol },
    endpoint: "time_series_1day",
    provider: "twelve-data",
    ttlMs: cacheTtls.historicalOhlc,
    url: url.toString(),
  });

  return {
    candles: (response.data.values ?? []).slice().reverse().map((value) => ({
      close: Number(value.close),
      date: value.datetime,
      high: Number(value.high),
      low: Number(value.low),
      open: Number(value.open),
      volume: value.volume ? Number(value.volume) : undefined,
    })),
    source: "twelve-data",
    ticker: symbol,
  };
}

// getTwelveDataQuote returns a current or delayed quote when TWELVE_DATA_API_KEY is configured.
export async function getTwelveDataQuote(ticker: string): Promise<LiveQuote | null> {
  const availability = getProviderAvailability("twelve-data");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("apikey", process.env.TWELVE_DATA_API_KEY ?? "");
  url.searchParams.set("symbol", symbol);

  const response = await fetchJsonWithCache<TwelveDataQuoteResponse>({
    budget: freeApiBudgets.twelveData,
    cacheParts: { symbol },
    endpoint: "quote",
    provider: "twelve-data",
    ttlMs: cacheTtls.quote,
    url: url.toString(),
  });

  return {
    currency: response.data.currency,
    name: response.data.name,
    percentChange: response.data.percent_change ? Number(response.data.percent_change) : undefined,
    price: Number(response.data.close ?? 0),
    source: "twelve-data",
    ticker: response.data.symbol ?? symbol,
  };
}

// normalizeTicker keeps provider requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
