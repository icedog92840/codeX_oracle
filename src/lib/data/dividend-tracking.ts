import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCurrency, formatPercent, formatShares } from "@/lib/calculations/format";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { NormalizedTransaction } from "@/lib/types/transactions";

// DividendMonth stores one monthly column in the dividend matrix.
export type DividendMonth = {
  index: number;
  label: string;
  total: number;
  displayTotal: string;
};

// DividendTrendPoint stores one bar in the payout trend chart.
export type DividendTrendPoint = {
  label: string;
  total: number;
  displayTotal: string;
};

// DividendAssetRow stores one dividend-paying asset row for the selected year.
export type DividendAssetRow = {
  ticker: string;
  name: string;
  startingDate: string;
  highestPayout: string;
  recentDividends: DividendAssetEvent[];
  monthly: number[];
  displayMonthly: string[];
  total: number;
  displayTotal: string;
  standardAverageCostValue: number;
  standardAverageCost: string;
  adjustedAverageCostValue: number;
  adjustedAverageCost: string;
  dripSharesValue: number;
  dripShares: string;
  dripAverageCostValue: number;
  dripAverageCost: string;
  yieldOnCostValue: number;
  yieldOnCost: string;
};

// DividendAssetEvent stores one recent dividend payment for ticker popouts and mobile cards.
export type DividendAssetEvent = {
  id: string;
  date: string;
  amount: string;
  description: string;
};

// DividendCalendarEvent stores one dated dividend payment from the CSV.
export type DividendCalendarEvent = {
  id: string;
  date: string;
  ticker: string;
  description: string;
  amount: string;
};

// DividendYearSelection allows one exact year or the aggregate all-years range.
export type DividendYearSelection = number | "all";

// DividendSortKey lists every visible or popout metric the dividend matrix can sort by.
export type DividendSortKey =
  | "ticker"
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec"
  | "total"
  | "yoc"
  | "dripShares";

// DividendSortDirection controls ascending or descending dividend matrix ordering.
export type DividendSortDirection = "asc" | "desc";

// DividendSortQuery stores the active sort state for the dividend matrix.
export type DividendSortQuery = {
  key: DividendSortKey;
  direction: DividendSortDirection;
};

// DividendTrendMode selects monthly or annual payout trend bars.
export type DividendTrendMode = "monthly" | "annual";

// DividendTrackingData is the display-ready payload for the dividend page.
export type DividendTrackingData = {
  selectedYear: number;
  selectedRangeKey: string;
  selectedRangeLabel: string;
  selectedMetricLabel: string;
  calendarRangeLabel: string;
  latestYear: number;
  availableYears: number[];
  months: DividendMonth[];
  annualTrendPoints: DividendTrendPoint[];
  assetRows: DividendAssetRow[];
  calendarEvents: DividendCalendarEvent[];
  totalForYear: string;
  allTimeTotal: string;
  payerCount: number;
  yearOverYearChange: string;
  yearOverYearTone: "positive" | "negative" | "neutral";
  sort: DividendSortQuery;
  trendMode: DividendTrendMode;
};

// DividendHoldingMetric stores cost-basis and DRIP totals calculated from the full CSV ledger.
type DividendHoldingMetric = {
  name: string;
  startingDate: string;
  shares: number;
  cost: number;
  nonDripShares: number;
  nonDripCost: number;
  dripShares: number;
  dripCost: number;
};

// getDividendTrackingData reads local CSV dividends and builds matrix/calendar views.
export function getDividendTrackingData(
  selection?: DividendYearSelection,
  sort: DividendSortQuery = { key: "total", direction: "desc" },
  trendMode: DividendTrendMode = "monthly",
): DividendTrackingData {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const dividendTransactions = transactions.filter(isDividendTransaction);
  const availableYears = Array.from(new Set(dividendTransactions.map((transaction) => transaction.date.getFullYear()))).sort((left, right) => right - left);
  const latestYear = availableYears[0] ?? new Date().getFullYear();
  const exactYear = typeof selection === "number" && availableYears.includes(selection) ? selection : latestYear;
  const isAllRange = selection === "all";
  const selectedDividends = isAllRange
    ? dividendTransactions
    : dividendTransactions.filter((transaction) => transaction.date.getFullYear() === exactYear);
  const holdingMetrics = buildDividendHoldingMetrics(transactions);
  const assetRows = sortAssetRows(buildAssetRows(selectedDividends, dividendTransactions, holdingMetrics), sort);
  const months = buildMonths(selectedDividends);
  const annualTrendPoints = buildAnnualTrendPoints(dividendTransactions);
  const totalForYear = selectedDividends.reduce((total, transaction) => total + Math.max(transaction.amount ?? 0, 0), 0);
  const allTimeTotal = dividendTransactions.reduce((total, transaction) => total + Math.max(transaction.amount ?? 0, 0), 0);
  const priorYearTotal = dividendTransactions
    .filter((transaction) => transaction.date.getFullYear() === exactYear - 1)
    .reduce((total, transaction) => total + Math.max(transaction.amount ?? 0, 0), 0);
  const yearOverYear = priorYearTotal > 0 ? (totalForYear - priorYearTotal) / priorYearTotal : 0;
  const selectedRangeLabel = isAllRange ? "All" : String(exactYear);

  return {
    selectedYear: exactYear,
    selectedRangeKey: isAllRange ? "all" : String(exactYear),
    selectedRangeLabel,
    selectedMetricLabel: isAllRange ? "All Dividends" : `${exactYear} Dividends`,
    calendarRangeLabel: isAllRange ? "across all years" : `in ${exactYear}`,
    latestYear,
    availableYears,
    months,
    annualTrendPoints,
    assetRows,
    calendarEvents: buildCalendarEvents(selectedDividends),
    totalForYear: formatCurrency(totalForYear),
    allTimeTotal: formatCurrency(allTimeTotal),
    payerCount: assetRows.length,
    yearOverYearChange: !isAllRange && priorYearTotal > 0 ? `${yearOverYear >= 0 ? "+" : "-"}${Math.abs(yearOverYear * 100).toFixed(1)}%` : "n/a",
    yearOverYearTone: !isAllRange && yearOverYear > 0 ? "positive" : !isAllRange && yearOverYear < 0 ? "negative" : "neutral",
    sort,
    trendMode,
  };
}

// parseDividendYear safely reads the selected year from URL search params.
export function parseDividendYear(searchParams: Record<string, string | string[] | undefined>) {
  const value = Array.isArray(searchParams.year) ? searchParams.year[0] : searchParams.year;

  if (value === "all" || value === "prior") {
    return "all";
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// parseDividendSortQuery safely reads dividend matrix sorting from URL search params.
export function parseDividendSortQuery(searchParams: Record<string, string | string[] | undefined>): DividendSortQuery {
  const sortValue = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const directionValue = Array.isArray(searchParams.direction) ? searchParams.direction[0] : searchParams.direction;
  const key = isDividendSortKey(sortValue) ? sortValue : "total";
  const direction = directionValue === "asc" || directionValue === "desc" ? directionValue : key === "ticker" ? "asc" : "desc";

  return {
    key,
    direction,
  };
}

// parseDividendTrendMode safely reads the active chart mode from URL search params.
export function parseDividendTrendMode(searchParams: Record<string, string | string[] | undefined>): DividendTrendMode {
  const value = Array.isArray(searchParams.trend) ? searchParams.trend[0] : searchParams.trend;
  return value === "annual" ? "annual" : "monthly";
}

// isDividendTransaction identifies cash dividend rows in the normalized CSV.
function isDividendTransaction(transaction: NormalizedTransaction) {
  return transaction.transCode === "CDIV" && transaction.amount !== null && transaction.amount > 0;
}

// buildAssetRows groups selected-range dividends while attaching historical payout context by ticker.
function buildAssetRows(
  transactions: NormalizedTransaction[],
  historicalTransactions: NormalizedTransaction[],
  holdingMetrics: Map<string, DividendHoldingMetric>,
): DividendAssetRow[] {
  const rows = new Map<string, { name: string; monthly: number[]; events: NormalizedTransaction[] }>();
  const historicalEventsByTicker = buildHistoricalDividendEventsByTicker(historicalTransactions);

  transactions.forEach((transaction) => {
    const ticker = transaction.ticker || "Cash";
    const existing = rows.get(ticker) ?? {
      name: extractDividendName(transaction),
      monthly: Array.from({ length: 12 }, () => 0),
      events: [],
    };

    existing.monthly[transaction.date.getMonth()] += Math.max(transaction.amount ?? 0, 0);
    existing.events.push(transaction);
    rows.set(ticker, existing);
  });

  return Array.from(rows.entries())
    .map(([ticker, row]) => {
      const total = row.monthly.reduce((sum, amount) => sum + amount, 0);
      const metric = holdingMetrics.get(ticker);
      const standardAverageCost = metric && metric.shares > 0 ? metric.cost / metric.shares : 0;
      const adjustedCost = metric ? Math.max(metric.cost - metric.dripCost, 0) : 0;
      const adjustedAverageCost = metric && metric.shares > 0 ? adjustedCost / metric.shares : 0;
      const dripAverageCost = metric && metric.dripShares > 0 ? metric.dripCost / metric.dripShares : 0;
      const yieldCostBasis = metric?.nonDripCost ?? 0;
      const yieldOnCost = yieldCostBasis > 0 ? total / yieldCostBasis : 0;
      const historicalEvents = historicalEventsByTicker.get(ticker) ?? [];
      const highestPayout = Math.max(...historicalEvents.map((event) => Math.max(event.amount ?? 0, 0)), 0);
      const recentDividends = historicalEvents
        .slice()
        .sort((left, right) => right.date.getTime() - left.date.getTime())
        .slice(0, 3)
        .map((event) => ({
          id: event.id,
          date: event.activityDate,
          amount: formatCurrency(event.amount ?? 0),
          description: event.description.replace(/\s+/g, " "),
        }));

      return {
        ticker,
        name: metric?.name ?? row.name,
        startingDate: metric?.startingDate ?? "-",
        highestPayout: highestPayout > 0 ? formatCurrency(highestPayout) : "-",
        recentDividends,
        monthly: row.monthly,
        displayMonthly: row.monthly.map((amount) => (amount > 0 ? formatCurrency(amount) : "-")),
        total,
        displayTotal: formatCurrency(total),
        standardAverageCostValue: standardAverageCost,
        standardAverageCost: standardAverageCost > 0 ? formatCurrency(standardAverageCost) : "-",
        adjustedAverageCostValue: adjustedAverageCost,
        adjustedAverageCost: adjustedAverageCost > 0 ? formatCurrency(adjustedAverageCost) : "-",
        dripSharesValue: metric?.dripShares ?? 0,
        dripShares: metric && metric.dripShares > 0 ? formatShares(metric.dripShares) : "-",
        dripAverageCostValue: dripAverageCost,
        dripAverageCost: dripAverageCost > 0 ? formatCurrency(dripAverageCost) : "-",
        yieldOnCostValue: yieldOnCost,
        yieldOnCost: yieldOnCost > 0 ? formatPercent(yieldOnCost) : "-",
      };
    })
    .sort((left, right) => right.total - left.total);
}

// buildHistoricalDividendEventsByTicker maps all CSV dividend payouts to each ticker.
function buildHistoricalDividendEventsByTicker(transactions: NormalizedTransaction[]) {
  return transactions.reduce<Map<string, NormalizedTransaction[]>>((eventsByTicker, transaction) => {
    const ticker = transaction.ticker || "Cash";
    const events = eventsByTicker.get(ticker) ?? [];
    events.push(transaction);
    eventsByTicker.set(ticker, events);

    return eventsByTicker;
  }, new Map());
}

// sortAssetRows applies the active URL sort to dividend-paying rows.
function sortAssetRows(rows: DividendAssetRow[], sort: DividendSortQuery) {
  return rows.slice().sort((left, right) => {
    const leftValue = getSortValue(left, sort.key);
    const rightValue = getSortValue(right, sort.key);
    const comparison = typeof leftValue === "string" && typeof rightValue === "string"
      ? leftValue.localeCompare(rightValue)
      : Number(leftValue) - Number(rightValue);

    return sort.direction === "asc" ? comparison : -comparison;
  });
}

// getSortValue returns the raw sortable value for one dividend row.
function getSortValue(row: DividendAssetRow, key: DividendSortKey) {
  const monthIndex = getMonthSortIndex(key);

  if (monthIndex !== null) {
    return row.monthly[monthIndex] ?? 0;
  }

  if (key === "ticker") {
    return row.ticker;
  }

  if (key === "yoc") {
    return row.yieldOnCostValue;
  }

  if (key === "dripShares") {
    return row.dripSharesValue;
  }

  return row.total;
}

// getMonthSortIndex maps month sort keys to their zero-based monthly array index.
function getMonthSortIndex(key: DividendSortKey) {
  const monthKeys: DividendSortKey[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const index = monthKeys.indexOf(key);
  return index === -1 ? null : index;
}

// isDividendSortKey guards untrusted URL sort values before applying them.
function isDividendSortKey(value: string | undefined): value is DividendSortKey {
  return [
    "ticker",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
    "total",
    "yoc",
    "dripShares",
  ].includes(value ?? "");
}

// buildDividendHoldingMetrics replays the full ledger so dividend rows can show current DRIP and cost context.
function buildDividendHoldingMetrics(transactions: NormalizedTransaction[]) {
  const metrics = new Map<string, DividendHoldingMetric>();

  transactions
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .forEach((transaction) => {
      if (!transaction.ticker) {
        return;
      }

      const metric = metrics.get(transaction.ticker) ?? createEmptyMetric(transaction);

      if (transaction.quantity === null) {
        metrics.set(transaction.ticker, metric);
        return;
      }

      if (isBuyLike(transaction.transCode)) {
        applyBuy(metric, transaction);
      }

      if (transaction.transCode === "Sell") {
        reduceOpenPosition(metric, Math.abs(transaction.quantity));
      }

      if (isShareMovement(transaction.transCode)) {
        applyShareMovement(metric, transaction.quantity, transaction.transCode);
      }

      metrics.set(transaction.ticker, metric);
    });

  return metrics;
}

// createEmptyMetric initializes one ticker's cost-basis buckets.
function createEmptyMetric(transaction: NormalizedTransaction): DividendHoldingMetric {
  return {
    name: extractDividendName(transaction),
    startingDate: transaction.activityDate,
    shares: 0,
    cost: 0,
    nonDripShares: 0,
    nonDripCost: 0,
    dripShares: 0,
    dripCost: 0,
  };
}

// applyBuy adds normal purchases and dividend reinvestment purchases into separate buckets.
function applyBuy(metric: DividendHoldingMetric, transaction: NormalizedTransaction) {
  const quantity = transaction.quantity ?? 0;
  const cost = Math.abs(transaction.amount ?? quantity * (transaction.price ?? 0));

  metric.shares += quantity;
  metric.cost += cost;

  if (isDividendReinvestment(transaction)) {
    metric.dripShares += quantity;
    metric.dripCost += cost;
    return;
  }

  metric.nonDripShares += quantity;
  metric.nonDripCost += cost;
}

// reduceOpenPosition removes sold or transferred shares proportionally from cost buckets.
function reduceOpenPosition(metric: DividendHoldingMetric, sharesToRemove: number) {
  if (metric.shares <= 0 || sharesToRemove <= 0) {
    return;
  }

  const removedShares = Math.min(sharesToRemove, metric.shares);
  const removalRatio = removedShares / metric.shares;

  metric.cost *= 1 - removalRatio;
  metric.nonDripShares *= 1 - removalRatio;
  metric.nonDripCost *= 1 - removalRatio;
  metric.dripShares *= 1 - removalRatio;
  metric.dripCost *= 1 - removalRatio;
  metric.shares -= removedShares;
}

// applyShareMovement handles stock transfers, splits, mergers, and stock dividends without adding cash cost.
function applyShareMovement(metric: DividendHoldingMetric, quantity: number, code: string) {
  if (code === "ACATO" && quantity < 0) {
    reduceOpenPosition(metric, Math.abs(quantity));
    return;
  }

  if (quantity < 0) {
    reduceOpenPosition(metric, Math.abs(quantity));
    return;
  }

  if (quantity === 0) {
    return;
  }

  const totalBucketShares = metric.nonDripShares + metric.dripShares;
  const nonDripRatio = totalBucketShares > 0 ? metric.nonDripShares / totalBucketShares : 1;

  metric.shares += quantity;
  metric.nonDripShares += quantity * nonDripRatio;
  metric.dripShares += quantity * (1 - nonDripRatio);
}

// isShareMovement identifies Robinhood rows that change shares without a normal buy or sell.
function isShareMovement(code: string) {
  return ["ACATO", "CONV", "MRGS", "REC", "SDIV", "SOFF", "SPL", "SPR", "SXCH"].includes(code);
}

// isBuyLike identifies normal buys plus Robinhood correction rows that increase shares with basis.
function isBuyLike(code: string) {
  return ["Buy", "BCXL"].includes(code);
}

// isDividendReinvestment identifies DRIP buy rows exported by Robinhood.
function isDividendReinvestment(transaction: NormalizedTransaction) {
  const description = transaction.description.toLowerCase();
  return (transaction.transCode === "Buy" && description.includes("dividend reinvestment")) || (transaction.transCode === "BCXL" && description.includes("drip"));
}

// buildMonths totals selected-year dividends by month for the bar chart.
function buildMonths(transactions: NormalizedTransaction[]): DividendMonth[] {
  const monthlyTotals = Array.from({ length: 12 }, () => 0);

  transactions.forEach((transaction) => {
    monthlyTotals[transaction.date.getMonth()] += Math.max(transaction.amount ?? 0, 0);
  });

  return monthlyTotals.map((total, index) => ({
    index,
    label: monthLabel(index),
    total,
    displayTotal: total > 0 ? formatCurrency(total) : "$0.00",
  }));
}

// buildAnnualTrendPoints groups all dividend cash by year for year-over-year charting.
function buildAnnualTrendPoints(transactions: NormalizedTransaction[]): DividendTrendPoint[] {
  const totalsByYear = new Map<number, number>();

  transactions.forEach((transaction) => {
    const year = transaction.date.getFullYear();
    totalsByYear.set(year, (totalsByYear.get(year) ?? 0) + Math.max(transaction.amount ?? 0, 0));
  });

  return Array.from(totalsByYear.entries())
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([year, total]) => ({
      label: String(year),
      total,
      displayTotal: formatCurrency(total),
    }));
}

// buildCalendarEvents lists the most recent selected-year dividends.
function buildCalendarEvents(transactions: NormalizedTransaction[]): DividendCalendarEvent[] {
  return transactions
    .slice()
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 24)
    .map((transaction) => ({
      id: transaction.id,
      date: transaction.activityDate,
      ticker: transaction.ticker || "Cash",
      description: transaction.description.replace(/\s+/g, " "),
      amount: formatCurrency(transaction.amount ?? 0),
    }));
}

// extractDividendName keeps dividend row names readable while preserving source context.
function extractDividendName(transaction: NormalizedTransaction) {
  return transaction.description.split(" - ")[0]?.trim() || transaction.ticker || "Dividend";
}

// monthLabel returns the compact month header used in the matrix.
function monthLabel(index: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2026, index, 1));
}
