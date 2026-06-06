// PortfolioHolding stores calculated position-level values before UI formatting.
export type PortfolioHolding = {
  ticker: string;
  name: string;
  shares: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
  weight: number;
  dividendYield: number;
  projectedAnnualDividendIncome: number;
};

// PortfolioSummary stores aggregate account values for dashboard metric cards.
export type PortfolioSummary = {
  totalPortfolioValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  totalDividendsPaid: number;
  projectedAnnualDividendIncome: number;
};

// AllocationSegment stores one donut chart segment.
export type AllocationSegment = {
  label: string;
  value: number;
  color: string;
};
