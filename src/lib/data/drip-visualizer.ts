import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCurrency, formatPercent, formatShares } from "@/lib/calculations/format";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// DripTickerOption stores one dividend-paying ticker available for visualization.
export type DripTickerOption = {
  ticker: string;
  name: string;
  dividendTotal: number;
};

// DripCurvePoint stores one historical or projected point in the comparison chart.
export type DripCurvePoint = {
  year: number;
  label: string;
  withDrip: number;
  withoutDrip: number;
  withDripDisplay: string;
  withoutDripDisplay: string;
  phase: "historical" | "projected";
};

// DripVisualizerData is the display-ready payload for the DRIP visualizer page.
export type DripVisualizerData = {
  tickerOptions: DripTickerOption[];
  selectedTicker: string;
  selectedName: string;
  startingDate: string;
  currentShares: string;
  dripShares: string;
  currentPrice: string;
  ttmDividends: string;
  estimatedYield: string;
  estimatedDividendGrowth: string;
  estimatedPriceGrowth: string;
  historicalPointCount: number;
  projectedPointCount: number;
  terminalWithDrip: string;
  terminalWithoutDrip: string;
  terminalDifference: string;
  defaultYearSpan: number;
  maxYearSpan: number;
  points: DripCurvePoint[];
};

// TickerReplayState tracks shares, cash dividends, and latest price while replaying one ticker's ledger.
type TickerReplayState = {
  withShares: number;
  withoutShares: number;
  withoutDividendCash: number;
  dripShares: number;
  latestPrice: number;
};

// getDripVisualizerData builds the zero-input DRIP comparison from the local Robinhood CSV.
export function getDripVisualizerData(selectedTicker?: string): DripVisualizerData {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const dividendTransactions = transactions.filter(isCashDividend);
  const tickerOptions = buildTickerOptions(dividendTransactions);
  const fallbackTicker = tickerOptions[0]?.ticker ?? "";
  const ticker = tickerOptions.some((option) => option.ticker === selectedTicker) ? selectedTicker ?? fallbackTicker : fallbackTicker;
  const tickerTransactions = transactions
    .filter((transaction) => transaction.ticker === ticker)
    .sort((left, right) => left.date.getTime() - right.date.getTime());
  const selectedName = extractName(tickerTransactions[0], ticker);
  const historicalReplay = replayHistoricalTicker(tickerTransactions);
  const projectedPoints = buildProjectedPoints(tickerTransactions, historicalReplay);
  const points = [...historicalReplay.points, ...projectedPoints.points];
  const currentPrice = historicalReplay.currentPrice || projectedPoints.currentPrice;
  const ttmDividends = calculateTrailingDividendTotal(tickerTransactions, 365);
  const estimatedYield = currentPrice > 0 && historicalReplay.currentWithShares > 0 ? ttmDividends / (historicalReplay.currentWithShares * currentPrice) : 0;
  const terminalPoint = points.at(-1);
  const terminalDifference = terminalPoint ? terminalPoint.withDrip - terminalPoint.withoutDrip : 0;

  return {
    tickerOptions,
    selectedTicker: ticker,
    selectedName,
    startingDate: tickerTransactions[0]?.activityDate ?? "-",
    currentShares: formatShares(historicalReplay.currentWithShares),
    dripShares: formatShares(historicalReplay.dripShares),
    currentPrice: formatCurrency(currentPrice),
    ttmDividends: formatCurrency(ttmDividends),
    estimatedYield: formatPercent(estimatedYield),
    estimatedDividendGrowth: formatPercent(projectedPoints.dividendGrowth),
    estimatedPriceGrowth: formatPercent(projectedPoints.priceGrowth),
    historicalPointCount: historicalReplay.points.length,
    projectedPointCount: projectedPoints.points.length,
    terminalWithDrip: formatCurrency(terminalPoint?.withDrip ?? 0),
    terminalWithoutDrip: formatCurrency(terminalPoint?.withoutDrip ?? 0),
    terminalDifference: formatSignedCurrency(terminalDifference),
    defaultYearSpan: Math.max(Math.min(historicalReplay.points.length + 3, points.length), 3),
    maxYearSpan: points.length,
    points,
  };
}

// parseDripTicker safely reads the selected ticker from URL search params.
export function parseDripTicker(searchParams: Record<string, string | string[] | undefined>) {
  const value = Array.isArray(searchParams.ticker) ? searchParams.ticker[0] : searchParams.ticker;
  return value?.trim().toUpperCase();
}

// buildTickerOptions finds dividend-paying tickers and sorts them by total dividend cash.
function buildTickerOptions(dividendTransactions: NormalizedTransaction[]): DripTickerOption[] {
  const totals = new Map<string, { name: string; dividendTotal: number }>();

  dividendTransactions.forEach((transaction) => {
    if (!transaction.ticker) {
      return;
    }

    const existing = totals.get(transaction.ticker) ?? {
      name: extractName(transaction, transaction.ticker),
      dividendTotal: 0,
    };

    existing.dividendTotal += Math.max(transaction.amount ?? 0, 0);
    totals.set(transaction.ticker, existing);
  });

  return Array.from(totals.entries())
    .map(([ticker, total]) => ({
      ticker,
      name: total.name,
      dividendTotal: total.dividendTotal,
    }))
    .sort((left, right) => right.dividendTotal - left.dividendTotal);
}

// replayHistoricalTicker builds yearly historical values with and without DRIP purchases.
function replayHistoricalTicker(transactions: NormalizedTransaction[]) {
  const firstYear = transactions[0]?.date.getFullYear() ?? new Date().getFullYear();
  const lastYear = transactions[transactions.length - 1]?.date.getFullYear() ?? firstYear;
  const state: TickerReplayState = {
    withShares: 0,
    withoutShares: 0,
    withoutDividendCash: 0,
    dripShares: 0,
    latestPrice: 0,
  };
  const points: DripCurvePoint[] = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    transactions
      .filter((transaction) => transaction.date.getFullYear() === year)
      .forEach((transaction) => applyHistoricalTransaction(state, transaction));

    points.push(toCurvePoint(year, state, "historical"));
  }

  return {
    points,
    currentPrice: state.latestPrice,
    currentWithShares: state.withShares,
    currentWithoutShares: state.withoutShares,
    currentWithoutDividendCash: state.withoutDividendCash,
    dripShares: state.dripShares,
  };
}

// applyHistoricalTransaction updates the ticker replay state from one CSV row.
function applyHistoricalTransaction(state: TickerReplayState, transaction: NormalizedTransaction) {
  if (transaction.price !== null && transaction.price > 0) {
    state.latestPrice = transaction.price;
  }

  if (transaction.transCode === "Buy" && transaction.quantity !== null) {
    state.withShares += transaction.quantity;

    if (isDividendReinvestment(transaction)) {
      state.dripShares += transaction.quantity;
      return;
    }

    state.withoutShares += transaction.quantity;
    return;
  }

  if (transaction.transCode === "Sell" && transaction.quantity !== null) {
    reduceShares(state, Math.abs(transaction.quantity));
    return;
  }

  if (isCashDividend(transaction)) {
    state.withoutDividendCash += Math.max(transaction.amount ?? 0, 0);
    return;
  }

  if (isShareMovement(transaction.transCode) && transaction.quantity !== null) {
    applyShareMovement(state, transaction.quantity);
  }
}

// buildProjectedPoints extends the curve into the future using CSV-derived growth estimates.
function buildProjectedPoints(transactions: NormalizedTransaction[], replay: ReturnType<typeof replayHistoricalTicker>) {
  const projectedYears = 12;
  const firstFutureYear = (replay.points.at(-1)?.year ?? new Date().getFullYear()) + 1;
  const currentPrice = Math.max(replay.currentPrice, 0.01);
  const dividendGrowth = estimateDividendGrowth(transactions);
  const priceGrowth = estimatePriceGrowth(transactions);
  const trailingDividends = calculateTrailingDividendTotal(transactions, 365);
  let dividendPerShare = replay.currentWithShares > 0 ? trailingDividends / replay.currentWithShares : 0;
  const state: TickerReplayState = {
    withShares: replay.currentWithShares,
    withoutShares: replay.currentWithoutShares,
    withoutDividendCash: replay.currentWithoutDividendCash,
    dripShares: replay.dripShares,
    latestPrice: currentPrice,
  };
  const points: DripCurvePoint[] = [];

  for (let index = 0; index < projectedYears; index += 1) {
    state.latestPrice *= 1 + priceGrowth;
    dividendPerShare *= 1 + dividendGrowth;

    const withDividendCash = state.withShares * dividendPerShare;
    const withoutDividendCash = state.withoutShares * dividendPerShare;

    if (state.latestPrice > 0) {
      const newDripShares = withDividendCash / state.latestPrice;
      state.withShares += newDripShares;
      state.dripShares += newDripShares;
    }

    state.withoutDividendCash += withoutDividendCash;
    points.push(toCurvePoint(firstFutureYear + index, state, "projected"));
  }

  return {
    points,
    currentPrice,
    dividendGrowth,
    priceGrowth,
  };
}

// toCurvePoint converts replay state into one chart point.
function toCurvePoint(year: number, state: TickerReplayState, phase: "historical" | "projected"): DripCurvePoint {
  const withDrip = state.withShares * state.latestPrice;
  const withoutDrip = state.withoutShares * state.latestPrice + state.withoutDividendCash;

  return {
    year,
    label: String(year),
    withDrip,
    withoutDrip,
    withDripDisplay: formatCurrency(withDrip),
    withoutDripDisplay: formatCurrency(withoutDrip),
    phase,
  };
}

// reduceShares removes sold or transferred shares from both comparison paths.
function reduceShares(state: TickerReplayState, quantity: number) {
  const withRemoved = Math.min(quantity, state.withShares);
  const withoutRemoved = Math.min(quantity, state.withoutShares);

  state.withShares -= withRemoved;
  state.withoutShares -= withoutRemoved;
  state.dripShares = Math.max(state.dripShares - Math.max(withRemoved - withoutRemoved, 0), 0);
}

// applyShareMovement applies split, merger, transfer, and stock-dividend share changes.
function applyShareMovement(state: TickerReplayState, quantity: number) {
  if (quantity < 0) {
    reduceShares(state, Math.abs(quantity));
    return;
  }

  const withRatio = state.withShares > 0 ? quantity / state.withShares : 0;
  const withoutRatio = state.withoutShares > 0 ? quantity / state.withoutShares : 0;

  state.withShares += quantity;
  state.withoutShares += Math.max(state.withoutShares * withoutRatio, 0);
  state.dripShares += Math.max(state.dripShares * withRatio, 0);
}

// formatSignedCurrency renders positive and negative dollar deltas for projection summaries.
function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

// calculateTrailingDividendTotal totals dividends within a trailing day window.
function calculateTrailingDividendTotal(transactions: NormalizedTransaction[], days: number) {
  const latestDate = transactions.at(-1)?.date;

  if (!latestDate) {
    return 0;
  }

  const startTime = latestDate.getTime() - days * 24 * 60 * 60 * 1000;

  return transactions.reduce((total, transaction) => {
    if (!isCashDividend(transaction) || transaction.date.getTime() < startTime) {
      return total;
    }

    return total + Math.max(transaction.amount ?? 0, 0);
  }, 0);
}

// estimateDividendGrowth compares recent trailing dividends with the prior trailing window.
function estimateDividendGrowth(transactions: NormalizedTransaction[]) {
  const latestDate = transactions.at(-1)?.date;

  if (!latestDate) {
    return 0.04;
  }

  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const recentStart = latestDate.getTime() - oneYear;
  const priorStart = latestDate.getTime() - oneYear * 2;
  const recent = sumDividendsBetween(transactions, recentStart, latestDate.getTime());
  const prior = sumDividendsBetween(transactions, priorStart, recentStart);

  if (prior <= 0) {
    return 0.04;
  }

  return clamp((recent - prior) / prior, -0.2, 0.25);
}

// estimatePriceGrowth approximates annual price growth from first and latest observed trade prices.
function estimatePriceGrowth(transactions: NormalizedTransaction[]) {
  const pricedTransactions = transactions.filter((transaction) => transaction.price !== null && transaction.price > 0);
  const first = pricedTransactions[0];
  const last = pricedTransactions.at(-1);

  if (!first || !last || !first.price || !last.price || first.price <= 0) {
    return 0.04;
  }

  const years = Math.max((last.date.getTime() - first.date.getTime()) / (365 * 24 * 60 * 60 * 1000), 1);
  const growth = (last.price / first.price) ** (1 / years) - 1;
  return clamp(growth, -0.12, 0.16);
}

// sumDividendsBetween totals cash dividend rows in a timestamp window.
function sumDividendsBetween(transactions: NormalizedTransaction[], startTime: number, endTime: number) {
  return transactions.reduce((total, transaction) => {
    const time = transaction.date.getTime();

    if (!isCashDividend(transaction) || time < startTime || time >= endTime) {
      return total;
    }

    return total + Math.max(transaction.amount ?? 0, 0);
  }, 0);
}

// isCashDividend identifies cash dividend rows exported by Robinhood.
function isCashDividend(transaction: NormalizedTransaction) {
  return transaction.transCode === "CDIV" && transaction.amount !== null && transaction.amount > 0;
}

// isDividendReinvestment identifies DRIP buy rows exported by Robinhood.
function isDividendReinvestment(transaction: NormalizedTransaction) {
  return transaction.transCode === "Buy" && transaction.description.toLowerCase().includes("dividend reinvestment");
}

// isShareMovement identifies Robinhood rows that change shares without normal buy or sell semantics.
function isShareMovement(code: string) {
  return ["ACATO", "CONV", "MRGS", "REC", "SDIV", "SOFF", "SPL", "SPR", "SXCH"].includes(code);
}

// extractName keeps ticker labels readable from Robinhood descriptions.
function extractName(transaction: NormalizedTransaction | undefined, fallback: string) {
  return transaction?.description.split("\n")[0]?.split(" - ")[0]?.trim() || fallback;
}

// clamp limits noisy estimates so projections stay visually sane.
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
