import type { LucideIcon } from "lucide-react";
import type { QuoteFreshnessMeta } from "@/lib/market-data/market-data-provider";

// Defines the compact metric card values shown on dashboard surfaces.
export type MetricCardValue = {
  label: string;
  fullTitle: string;
  description: string;
  value: string;
  delta: string;
  tone: "positive" | "neutral" | "warning";
  icon: LucideIcon;
};

// Defines the minimal holding shape used by the Phase 1 table preview.
export type HoldingPreview = {
  ticker: string;
  name: string;
  shares: string;
  weight: string;
  averagePrice: string;
  totalCost: string;
  currentPrice: string;
  marketValue: string;
  profitLoss: string;
  profitLossPercent: string;
  quoteFreshness: QuoteFreshnessMeta;
};

// Defines a labeled point for lightweight CSS chart placeholders.
export type ChartPoint = {
  label: string;
  value: number;
  amount: number;
  displayValue: string;
};
