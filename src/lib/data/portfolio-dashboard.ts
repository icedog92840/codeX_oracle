import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CircleDollarSign, HandCoins, LineChart, Percent } from "lucide-react";
import {
  buildAllocationSegments,
  buildPortfolioHoldings,
  buildPortfolioSummary,
  buildTrajectoryPoints,
} from "@/lib/calculations/portfolio";
import {
  formatCurrency,
  formatPercent,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/calculations/format";
import { getMarketDataProvider } from "@/lib/market-data/market-data-resolver";
import { parseRobinhoodCsv } from "@/lib/parsing/robinhood";
import type { HoldingPreview, MetricCardValue } from "@/lib/types/dashboard";

// getPortfolioDashboardData is the server-side bridge between local CSV data and UI-ready props.
export function getPortfolioDashboardData() {
  const csvText = readFileSync(join(process.cwd(), "Transaction_Log.csv"), "utf-8");
  const transactions = parseRobinhoodCsv(csvText);
  const marketData = getMarketDataProvider().getMarketData(transactions);
  const holdings = buildPortfolioHoldings(transactions, marketData);
  const summary = buildPortfolioSummary(holdings, transactions);

  return {
    metrics: buildMetricCards(summary),
    holdings: holdings.map(toHoldingPreview),
    trajectoryPoints: buildTrajectoryPoints(transactions, marketData),
    allocationSegments: buildAllocationSegments(holdings),
    transactionCount: transactions.length,
  };
}

// buildMetricCards formats aggregate portfolio values for the dashboard metric component.
function buildMetricCards(summary: ReturnType<typeof buildPortfolioSummary>): MetricCardValue[] {
  return [
    {
      label: "Portfolio Value",
      fullTitle: "Total Portfolio Value",
      description: "Estimated current market value of open holdings from the CSV, using placeholder prices until live quotes are connected.",
      value: formatCurrency(summary.totalPortfolioValue),
      delta: `${formatSignedPercent(summary.totalProfitLossPercent)} P/L`,
      tone: summary.totalProfitLoss >= 0 ? "positive" : "warning",
      icon: CircleDollarSign,
    },
    {
      label: "Total P/L",
      fullTitle: "Total Profit / Loss",
      description: "Estimated unrealized gain or loss for open holdings: current placeholder market value minus calculated cost basis.",
      value: formatSignedCurrency(summary.totalProfitLoss),
      delta: formatSignedPercent(summary.totalProfitLossPercent),
      tone: summary.totalProfitLoss >= 0 ? "positive" : "warning",
      icon: LineChart,
    },
    {
      label: "Dividends Paid",
      fullTitle: "Total Dividends Paid",
      description: "Total cash dividends found in the CSV from CDIV rows. This is historical dividend cash received, not a forward projection.",
      value: formatCurrency(summary.totalDividendsPaid),
      delta: "CSV history",
      tone: "positive",
      icon: HandCoins,
    },
    {
      label: "PADI",
      fullTitle: "Projected Annual Dividend Income",
      description: "Estimated annual dividend income using recent local CSV dividend rows as a placeholder until live forward dividend yield data is connected.",
      value: formatCurrency(summary.projectedAnnualDividendIncome),
      delta: formatPercent(summary.totalPortfolioValue > 0 ? summary.projectedAnnualDividendIncome / summary.totalPortfolioValue : 0),
      tone: "warning",
      icon: Percent,
    },
  ];
}

// toHoldingPreview converts calculated holding numbers into dense table strings.
function toHoldingPreview(holding: ReturnType<typeof buildPortfolioHoldings>[number]): HoldingPreview {
  return {
    ticker: holding.ticker,
    name: holding.name,
    shares: formatShares(holding.shares),
    weight: formatPercent(holding.weight),
    averagePrice: formatCurrency(holding.averagePrice),
    totalCost: formatCurrency(holding.totalCost),
    currentPrice: formatCurrency(holding.currentPrice),
    marketValue: formatCurrency(holding.marketValue),
    profitLoss: formatSignedCurrency(holding.profitLoss),
    profitLossPercent: formatSignedPercent(holding.profitLossPercent),
  };
}
