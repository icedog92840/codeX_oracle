import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzerDataSettings } from "@/lib/analyzer/analyzer-data-settings";
import { buildPortfolioHoldings, buildPortfolioSummary } from "@/lib/calculations/portfolio";
import { formatCurrency, formatPercent, formatShares } from "@/lib/calculations/format";
import { getMarketDataProvider } from "@/lib/market-data/market-data-resolver";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// InsightChip stores one compact metric shown in the page-aware top ribbon.
export type InsightChip = {
  label: string;
  value: string;
  tone?: "accent" | "positive" | "neutral" | "warning";
};

// InsightRoutePayload stores the chips and rotating briefing lines for one route.
export type InsightRoutePayload = {
  chips: InsightChip[];
  briefings: string[];
};

// InsightDataStatusItem explains one source or assumption behind the displayed app data.
export type InsightDataStatusItem = {
  label: string;
  value: string;
  detail: string;
  tone?: "accent" | "positive" | "neutral" | "warning";
};

// InsightRibbonData stores every route's ribbon content plus shared investing principles.
export type InsightRibbonData = {
  dashboard: InsightRoutePayload;
  dividends: InsightRoutePayload;
  transactions: InsightRoutePayload;
  drip: InsightRoutePayload;
  analyzer: InsightRoutePayload;
  principles: string[];
  dataStatus: InsightDataStatusItem[];
};

// getInsightRibbonData reads the local CSV once and builds compact route-aware briefing data.
export function getInsightRibbonData(): InsightRibbonData {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const marketData = getMarketDataProvider().getMarketData(transactions);
  const holdings = buildPortfolioHoldings(transactions, marketData);
  const summary = buildPortfolioSummary(holdings, transactions);
  const dividendTransactions = transactions.filter(isCashDividend);
  const latestYear = getLatestDividendYear(dividendTransactions);
  const latestYearDividends = dividendTransactions.filter((transaction) => transaction.date.getFullYear() === latestYear);
  const allTimeDividendTotal = sumAmounts(dividendTransactions);
  const latestYearDividendTotal = sumAmounts(latestYearDividends);
  const topHolding = holdings.slice().sort((left, right) => right.marketValue - left.marketValue)[0];
  const topPayer = getTopDividendPayer(dividendTransactions);
  const strongestMonth = getStrongestDividendMonth(latestYearDividends);
  const transactionStats = buildTransactionStats(transactions);
  const dripStats = buildDripStats(transactions);
  const analyzerModeLabel = analyzerDataSettings.activeSource === "mock" ? "Mock OHLC" : "Live OHLC";
  const analyzerFeedLabel = analyzerDataSettings.activeSource === "mock" ? "Offline" : analyzerDataSettings.liveProviderName;

  return {
    dashboard: {
      chips: [
        { label: "Holdings", value: String(holdings.length), tone: "accent" },
        { label: "Dividends", value: formatCurrency(summary.totalDividendsPaid), tone: "positive" },
        { label: "Top Weight", value: topHolding?.ticker ?? "-", tone: "neutral" },
        { label: "Last CSV", value: transactionStats.lastDate, tone: "neutral" },
      ],
      briefings: [
        `${topHolding?.ticker ?? "Your largest holding"} is currently the largest open position by placeholder market value.`,
        `The CSV ledger contains ${transactions.length.toLocaleString()} rows and ${holdings.length.toLocaleString()} open holdings.`,
        `Historical dividends paid total ${formatCurrency(summary.totalDividendsPaid)} from local CSV dividend rows.`,
      ],
    },
    dividends: {
      chips: [
        { label: "Daily Avg", value: formatCurrency(latestYearDividendTotal / 365), tone: "positive" },
        { label: "Weekly Avg", value: formatCurrency(latestYearDividendTotal / 52), tone: "positive" },
        { label: "Monthly Avg", value: formatCurrency(latestYearDividendTotal / 12), tone: "positive" },
        { label: "Year Pace", value: formatCurrency(latestYearDividendTotal), tone: "accent" },
      ],
      briefings: [
        `${topPayer.ticker} is the strongest historical dividend payer at ${formatCurrency(topPayer.total)} received.`,
        `${strongestMonth.label} is the strongest dividend month in ${latestYear}, totaling ${formatCurrency(strongestMonth.total)}.`,
        `All-time dividend cash in the local CSV totals ${formatCurrency(allTimeDividendTotal)}.`,
      ],
    },
    transactions: {
      chips: [
        { label: "Rows", value: transactions.length.toLocaleString(), tone: "accent" },
        { label: "Last Row", value: transactionStats.lastDate, tone: "neutral" },
        { label: "Active Ticker", value: transactionStats.mostActiveTicker, tone: "neutral" },
        { label: "Largest Cash", value: formatCurrency(transactionStats.largestCashAmount), tone: "warning" },
      ],
      briefings: [
        `${transactionStats.mostActiveTicker} has the most CSV activity by row count.`,
        `The most recent parsed transaction date is ${transactionStats.lastDate}.`,
        `The transaction table is paged at 100 rows so verification stays fast and readable.`,
      ],
    },
    drip: {
      chips: [
        { label: "DRIP Shares", value: formatShares(dripStats.totalDripShares), tone: "positive" },
        { label: "Best DRIP", value: dripStats.bestDripTicker, tone: "accent" },
        { label: "Best YOC", value: formatPercent(dripStats.highestYieldOnCost), tone: "positive" },
        { label: "DRIP Assets", value: String(dripStats.dripAssetCount), tone: "neutral" },
      ],
      briefings: [
        `${dripStats.bestDripTicker} has contributed the most dividend-reinvested shares in the local ledger.`,
        `The DRIP model compares cash-dividend accumulation against automatic reinvestment using parsed CSV history.`,
        `Projected DRIP curves still use local placeholder math until live forward data is connected.`,
      ],
    },
    analyzer: {
      chips: [
        { label: "Local Mode", value: analyzerModeLabel, tone: "accent" },
        { label: "Indicators", value: "SMA RSI MACD", tone: "neutral" },
        { label: "Storage", value: "Browser", tone: "neutral" },
        { label: "Feed", value: analyzerFeedLabel, tone: analyzerDataSettings.activeSource === "mock" ? "warning" : "positive" },
      ],
      briefings: [
        "Analyzer scans use deterministic mock OHLC data, local indicators, and browser-saved watchlist snapshots.",
        "Scores combine trend, RSI momentum, support proximity, and MACD behavior into a transparent grade.",
        "The market-data provider is isolated so live quotes can be plugged in later without rewriting the UI.",
      ],
    },
    principles: [
      "Risk first, return second: staying solvent keeps every future opportunity available.",
      "A durable portfolio is easier to hold when the data is clear and the assumptions are visible.",
      "Compounding favors patience, but only when the underlying position still deserves patience.",
      "Cash flow is not just income; it is optionality that arrives on a schedule.",
    ],
    dataStatus: [
      {
        label: "Portfolio Ledger",
        value: `${transactions.length.toLocaleString()} CSV rows`,
        detail: `Holdings, dividends, DRIP, transactions, and dashboard metrics are parsed from Transaction_Log.csv. Latest parsed row: ${transactionStats.lastDate}.`,
        tone: "positive",
      },
      {
        label: "Market Prices",
        value: marketData.source === "local-placeholder" ? "Local placeholders" : "Live provider",
        detail: "Current prices use the isolated market-data provider. Today it remains local-only and estimates quotes from the latest known CSV prices.",
        tone: marketData.source === "local-placeholder" ? "warning" : "positive",
      },
      {
        label: "Dividend Yields",
        value: marketData.source === "local-placeholder" ? "Estimated locally" : "Live provider",
        detail: "PADI and yield context use local trailing dividend math until a live forward dividend yield provider is connected.",
        tone: marketData.source === "local-placeholder" ? "warning" : "positive",
      },
      {
        label: "Analyzer Feed",
        value: analyzerModeLabel,
        detail: `Analyzer scans currently use ${analyzerDataSettings.activeSource === "mock" ? "deterministic local" : "configured live"} ${analyzerDataSettings.candleLookbackDays}-day OHLC data with local SMA, RSI, MACD, support, resistance, score, and grade calculations.`,
        tone: analyzerDataSettings.activeSource === "mock" ? "accent" : "positive",
      },
    ],
  };
}

// isCashDividend identifies Robinhood cash dividend rows.
function isCashDividend(transaction: NormalizedTransaction) {
  return transaction.transCode === "CDIV" && transaction.amount !== null && transaction.amount > 0;
}

// isDividendReinvestment identifies buy rows created by dividend reinvestment.
function isDividendReinvestment(transaction: NormalizedTransaction) {
  const description = transaction.description.toLowerCase();
  return (transaction.transCode === "Buy" && description.includes("dividend reinvestment")) || (transaction.transCode === "BCXL" && description.includes("drip"));
}

// sumAmounts totals positive transaction amounts.
function sumAmounts(transactions: NormalizedTransaction[]) {
  return transactions.reduce((total, transaction) => total + Math.max(transaction.amount ?? 0, 0), 0);
}

// getLatestDividendYear finds the newest dividend year in the CSV.
function getLatestDividendYear(transactions: NormalizedTransaction[]) {
  return Math.max(...transactions.map((transaction) => transaction.date.getFullYear()), new Date().getFullYear());
}

// getTopDividendPayer returns the ticker with the largest historical dividend total.
function getTopDividendPayer(transactions: NormalizedTransaction[]) {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    const ticker = transaction.ticker || "Cash";
    totals.set(ticker, (totals.get(ticker) ?? 0) + Math.max(transaction.amount ?? 0, 0));
  });

  const [ticker = "-", total = 0] = Array.from(totals.entries()).sort((left, right) => right[1] - left[1])[0] ?? [];
  return { ticker, total };
}

// getStrongestDividendMonth finds the largest monthly dividend bucket for the latest year.
function getStrongestDividendMonth(transactions: NormalizedTransaction[]) {
  const totals = Array.from({ length: 12 }, () => 0);

  transactions.forEach((transaction) => {
    totals[transaction.date.getMonth()] += Math.max(transaction.amount ?? 0, 0);
  });

  const index = totals.reduce((bestIndex, total, currentIndex) => (total > totals[bestIndex] ? currentIndex : bestIndex), 0);

  return {
    label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2026, index, 1)),
    total: totals[index] ?? 0,
  };
}

// buildTransactionStats derives compact activity metrics from the CSV.
function buildTransactionStats(transactions: NormalizedTransaction[]) {
  const sorted = transactions.slice().sort((left, right) => right.date.getTime() - left.date.getTime());
  const tickerCounts = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!transaction.ticker) {
      return;
    }

    tickerCounts.set(transaction.ticker, (tickerCounts.get(transaction.ticker) ?? 0) + 1);
  });

  const [mostActiveTicker = "-"] = Array.from(tickerCounts.entries()).sort((left, right) => right[1] - left[1])[0] ?? [];
  const largestCashAmount = Math.max(...transactions.map((transaction) => Math.abs(transaction.amount ?? 0)), 0);

  return {
    lastDate: sorted[0]?.activityDate ?? "-",
    largestCashAmount,
    mostActiveTicker,
  };
}

// buildDripStats totals reinvested shares and yield-on-cost context from the CSV ledger.
function buildDripStats(transactions: NormalizedTransaction[]) {
  const dripByTicker = new Map<string, number>();
  const dividendByTicker = new Map<string, number>();
  const nonDripCostByTicker = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!transaction.ticker) {
      return;
    }

    if (isDividendReinvestment(transaction)) {
      dripByTicker.set(transaction.ticker, (dripByTicker.get(transaction.ticker) ?? 0) + Math.max(transaction.quantity ?? 0, 0));
      return;
    }

    if (isBuyLike(transaction.transCode)) {
      nonDripCostByTicker.set(transaction.ticker, (nonDripCostByTicker.get(transaction.ticker) ?? 0) + Math.abs(transaction.amount ?? 0));
    }

    if (isCashDividend(transaction)) {
      dividendByTicker.set(transaction.ticker, (dividendByTicker.get(transaction.ticker) ?? 0) + Math.max(transaction.amount ?? 0, 0));
    }
  });

  const totalDripShares = Array.from(dripByTicker.values()).reduce((total, shares) => total + shares, 0);
  const [bestDripTicker = "-"] = Array.from(dripByTicker.entries()).sort((left, right) => right[1] - left[1])[0] ?? [];
  const highestYieldOnCost = Array.from(dividendByTicker.entries()).reduce((highest, [ticker, dividends]) => {
    const cost = nonDripCostByTicker.get(ticker) ?? 0;
    const yieldOnCost = cost > 0 ? dividends / cost : 0;

    return Math.max(highest, yieldOnCost);
  }, 0);

  return {
    totalDripShares,
    bestDripTicker,
    highestYieldOnCost,
    dripAssetCount: dripByTicker.size,
  };
}

// isBuyLike identifies normal buys plus Robinhood correction rows that increase shares with basis.
function isBuyLike(code: string) {
  return ["Buy", "BCXL"].includes(code);
}
