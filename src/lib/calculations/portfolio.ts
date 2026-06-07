import type { ChartPoint } from "@/lib/types/dashboard";
import type { AllocationSegment, PortfolioHolding, PortfolioSummary } from "@/lib/types/portfolio";
import type { NormalizedTransaction } from "@/lib/types/transactions";
import type { MarketDataSnapshot } from "@/lib/market-data/market-data-provider";

// buildPortfolioHoldings calculates open positions from normalized Robinhood transactions.
export function buildPortfolioHoldings(
  transactions: NormalizedTransaction[],
  marketData: MarketDataSnapshot,
): PortfolioHolding[] {
  const positionMap = new Map<string, { shares: number; cost: number; name: string }>();

  transactions.forEach((transaction) => {
    if (!transaction.ticker || transaction.quantity === null) {
      return;
    }

    const existing = positionMap.get(transaction.ticker) ?? {
      shares: 0,
      cost: 0,
      name: extractCompanyName(transaction.description, transaction.ticker),
    };

    if (isBuyLike(transaction.transCode)) {
      existing.shares += transaction.quantity;
      existing.cost += Math.abs(transaction.amount ?? transaction.quantity * (transaction.price ?? 0));
    }

    if (isSellLike(transaction.transCode)) {
      const averageCost = existing.shares > 0 ? existing.cost / existing.shares : 0;
      existing.shares -= transaction.quantity;
      existing.cost -= averageCost * transaction.quantity;
    }

    if (isShareMovement(transaction.transCode)) {
      applyShareMovement(existing, transaction.quantity, transaction.transCode);
    }

    positionMap.set(transaction.ticker, existing);
  });

  const holdings = Array.from(positionMap.entries())
    .filter(([, position]) => position.shares > 0.0001)
    .map(([ticker, position]) => {
      const averagePrice = position.shares > 0 ? position.cost / position.shares : 0;
      const currentPrice = marketData.currentPriceByTicker[ticker] ?? averagePrice;
      const marketValue = position.shares * currentPrice;
      const profitLoss = marketValue - position.cost;
      const profitLossPercent = position.cost > 0 ? profitLoss / position.cost : 0;
      const dividendYield = estimateYieldFromDividendDollars(marketData.dividendYieldByTicker[ticker], marketValue);

      return {
        ticker,
        name: position.name,
        shares: position.shares,
        averagePrice,
        totalCost: position.cost,
        currentPrice,
        marketValue,
        profitLoss,
        profitLossPercent,
        weight: 0,
        dividendYield,
        projectedAnnualDividendIncome: marketValue * dividendYield,
      };
    });

  return applyPortfolioWeights(holdings);
}

// buildPortfolioSummary rolls calculated holdings and cash activity into dashboard KPIs.
export function buildPortfolioSummary(
  holdings: PortfolioHolding[],
  transactions: NormalizedTransaction[],
): PortfolioSummary {
  const totalPortfolioValue = holdings.reduce((total, holding) => total + holding.marketValue, 0);
  const totalCost = holdings.reduce((total, holding) => total + holding.totalCost, 0);
  const projectedAnnualDividendIncome = holdings.reduce(
    (total, holding) => total + holding.projectedAnnualDividendIncome,
    0,
  );
  const totalDividendsPaid = transactions.reduce((total, transaction) => {
    if (transaction.transCode !== "CDIV" || transaction.amount === null) {
      return total;
    }

    return total + Math.max(transaction.amount, 0);
  }, 0);
  const totalProfitLoss = totalPortfolioValue - totalCost;

  return {
    totalPortfolioValue,
    totalProfitLoss,
    totalProfitLossPercent: totalCost > 0 ? totalProfitLoss / totalCost : 0,
    totalDividendsPaid,
    projectedAnnualDividendIncome,
  };
}

// buildAllocationSegments converts current holdings into compact donut chart segments.
export function buildAllocationSegments(holdings: PortfolioHolding[]): AllocationSegment[] {
  const colors = ["#38d5ff", "#4f8cff", "#7c3aed", "#bd1dff", "#25e0bf", "#3d4158"];
  const leadingSegments = holdings
    .slice()
    .sort((left, right) => right.marketValue - left.marketValue)
    .slice(0, 5)
    .map((holding, index) => ({
      label: holding.ticker,
      value: Number((holding.weight * 100).toFixed(1)),
      color: colors[index % colors.length],
    }));

  const usedPercent = leadingSegments.reduce((total, segment) => total + segment.value, 0);
  const otherPercent = Math.max(Number((100 - usedPercent).toFixed(1)), 0);

  if (otherPercent > 0) {
    leadingSegments.push({
      label: "Other",
      value: otherPercent,
      color: colors[5],
    });
  }

  return leadingSegments;
}

// buildTrajectoryPoints creates a normalized monthly activity curve from the local transaction log.
export function buildTrajectoryPoints(
  transactions: NormalizedTransaction[],
  marketData: MarketDataSnapshot,
): ChartPoint[] {
  const sharesByTicker = new Map<string, number>();
  const priceByTicker = new Map<string, number>();
  const monthlyValues = new Map<string, number>();

  transactions
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .forEach((transaction) => {
      if (!transaction.ticker || transaction.quantity === null) {
        return;
      }

      const existingShares = sharesByTicker.get(transaction.ticker) ?? 0;

      if (isBuyLike(transaction.transCode)) {
        sharesByTicker.set(transaction.ticker, existingShares + transaction.quantity);
      }

      if (isSellLike(transaction.transCode)) {
        sharesByTicker.set(transaction.ticker, existingShares - Math.abs(transaction.quantity));
      }

      if (isShareMovement(transaction.transCode)) {
        sharesByTicker.set(transaction.ticker, existingShares + transaction.quantity);
      }

      if (transaction.price !== null && transaction.price > 0) {
        priceByTicker.set(transaction.ticker, transaction.price);
      }

      const key = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, "0")}`;
      monthlyValues.set(key, estimateCurrentPositionValue(sharesByTicker, priceByTicker, marketData));
    });

  const valuePoints = Array.from(monthlyValues.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([key, amount]) => {
      const [year, month] = key.split("-");

      return {
        label: `${monthName(Number(month))} ${year.slice(2)}`,
        amount,
      };
    });

  if (valuePoints.length === 0) {
    return [];
  }

  const amounts = valuePoints.map((point) => point.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const spread = Math.max(max - min, 1);

  return valuePoints.map((point) => ({
    label: point.label,
    amount: point.amount,
    displayValue: formatCompactCurrency(point.amount),
    value: Math.round(((point.amount - min) / spread) * 76 + 12),
  }));
}

// estimateCurrentPositionValue multiplies month-end shares by the best known price available.
function estimateCurrentPositionValue(
  sharesByTicker: Map<string, number>,
  priceByTicker: Map<string, number>,
  marketData: MarketDataSnapshot,
) {
  return Array.from(sharesByTicker.entries()).reduce((total, [ticker, shares]) => {
    if (shares <= 0) {
      return total;
    }

    const price = priceByTicker.get(ticker) ?? marketData.currentPriceByTicker[ticker] ?? 0;
    return total + shares * price;
  }, 0);
}

// formatCompactCurrency keeps chart axis labels readable in the tight graph area.
function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

// applyPortfolioWeights assigns each holding its market-value percentage of the portfolio.
function applyPortfolioWeights(holdings: PortfolioHolding[]) {
  const totalPortfolioValue = holdings.reduce((total, holding) => total + holding.marketValue, 0);

  return holdings
    .map((holding) => ({
      ...holding,
      weight: totalPortfolioValue > 0 ? holding.marketValue / totalPortfolioValue : 0,
    }))
    .sort((left, right) => right.marketValue - left.marketValue);
}

// estimateYieldFromDividendDollars treats local TTM dividends as a static yield placeholder.
function estimateYieldFromDividendDollars(trailingDividendDollars = 0, marketValue: number) {
  return marketValue > 0 ? trailingDividendDollars / marketValue : 0;
}

// isBuyLike identifies transaction codes that increase shares with cost basis.
function isBuyLike(code: string) {
  return ["Buy", "BCXL"].includes(code);
}

// isSellLike identifies transaction codes that decrease shares and reduce cost basis.
function isSellLike(code: string) {
  return ["Sell"].includes(code);
}

// isShareMovement identifies Robinhood corporate-action rows that alter share counts.
function isShareMovement(code: string) {
  return ["ACATO", "CONV", "MRGS", "REC", "SDIV", "SOFF", "SPL", "SPR", "SXCH"].includes(code);
}

// applyShareMovement handles splits, mergers, stock dividends, exchanges, and transfers.
function applyShareMovement(
  position: { shares: number; cost: number; name: string },
  quantity: number,
  code: string,
) {
  if (code === "ACATO" && quantity < 0) {
    // ACATO with an S suffix is a transfer out, so reduce cost basis with the removed shares.
    const removedShares = Math.min(Math.abs(quantity), position.shares);
    const averageCost = position.shares > 0 ? position.cost / position.shares : 0;
    position.shares -= removedShares;
    position.cost -= averageCost * removedShares;
    return;
  }

  // Split, stock-dividend, merger, and exchange rows alter share count while preserving basis.
  position.shares += quantity;
}

// extractCompanyName removes CUSIP detail from Robinhood descriptions.
function extractCompanyName(description: string, fallback: string) {
  return description.split("\n")[0]?.trim() || fallback;
}

// monthName converts a month number into the compact dashboard label.
function monthName(month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2026, month - 1, 1));
}
