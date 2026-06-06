import {
  Banknote,
  CircleDollarSign,
  LineChart,
  Percent,
} from "lucide-react";
import type { ChartPoint, HoldingPreview, MetricCardValue } from "@/lib/types/dashboard";

// Mock summary metrics keep the Phase 1 dashboard visually realistic before CSV parsing exists.
export const phaseOneMetrics: MetricCardValue[] = [
  {
    label: "Portfolio Value",
    value: "$128,430.22",
    delta: "+8.42%",
    tone: "positive",
    icon: CircleDollarSign,
  },
  {
    label: "Buying Power",
    value: "$6,214.08",
    delta: "Cash",
    tone: "neutral",
    icon: Banknote,
  },
  {
    label: "Total P/L",
    value: "$14,902.71",
    delta: "+13.12%",
    tone: "positive",
    icon: LineChart,
  },
  {
    label: "PADI",
    value: "$3,486.40",
    delta: "2.71%",
    tone: "warning",
    icon: Percent,
  },
];

// Mock trajectory points provide a visual asset until historical CSV calculations are wired in.
export const trajectoryPoints: ChartPoint[] = [
  { label: "Jan", value: 46 },
  { label: "Feb", value: 52 },
  { label: "Mar", value: 49 },
  { label: "Apr", value: 61 },
  { label: "May", value: 66 },
  { label: "Jun", value: 74 },
  { label: "Jul", value: 71 },
  { label: "Aug", value: 83 },
  { label: "Sep", value: 88 },
  { label: "Oct", value: 92 },
  { label: "Nov", value: 95 },
  { label: "Dec", value: 100 },
];

// Mock allocation values set the initial donut chart proportions.
export const allocationSegments = [
  { label: "Technology", value: 38, color: "#2563eb" },
  { label: "Financials", value: 22, color: "#16a34a" },
  { label: "Healthcare", value: 17, color: "#f59e0b" },
  { label: "Consumer", value: 13, color: "#7c3aed" },
  { label: "Cash", value: 10, color: "#64748b" },
];

// Mock holdings mirror the target dense table structure before Robinhood CSV ingestion is added.
export const holdingsPreview: HoldingPreview[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    shares: "42.25",
    weight: "24.18%",
    averagePrice: "$161.82",
    totalCost: "$6,835.40",
    // TODO: Fetch Live Stock Price
    currentPrice: "$196.45",
    marketValue: "$8,299.01",
    profitLoss: "+$1,463.61",
    profitLossPercent: "+21.41%",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    shares: "18.00",
    weight: "21.06%",
    averagePrice: "$328.10",
    totalCost: "$5,905.80",
    // TODO: Fetch Live Stock Price
    currentPrice: "$452.34",
    marketValue: "$8,142.12",
    profitLoss: "+$2,236.32",
    profitLossPercent: "+37.87%",
  },
  {
    ticker: "SCHD",
    name: "Schwab U.S. Dividend Equity ETF",
    shares: "96.80",
    weight: "18.52%",
    averagePrice: "$72.44",
    totalCost: "$7,012.19",
    // TODO: Fetch Live Stock Price
    currentPrice: "$73.62",
    marketValue: "$7,126.42",
    profitLoss: "+$114.23",
    profitLossPercent: "+1.63%",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    shares: "21.50",
    weight: "12.36%",
    averagePrice: "$176.25",
    totalCost: "$3,789.38",
    // TODO: Fetch Live Stock Price
    currentPrice: "$221.80",
    marketValue: "$4,768.70",
    profitLoss: "+$979.32",
    profitLossPercent: "+25.84%",
  },
];

// TODO: Fetch Live Dividend Yield
export const mockDividendYieldByTicker: Record<string, number> = {
  AAPL: 0.0051,
  MSFT: 0.0072,
  SCHD: 0.0365,
  JPM: 0.021,
};
