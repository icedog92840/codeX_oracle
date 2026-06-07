import type { OhlcCandle, ValueDataConfidence, ValueMetric, ValueScore, ValueScorecard } from "@/lib/analyzer/types";
import type { FundamentalSnapshot } from "@/lib/external-data/types";

// ValueScoreInput stores the fields used to build Graham/Buffett style scores.
type ValueScoreInput = {
  candles: OhlcCandle[];
  dividendYield: number;
  fundamentals?: FundamentalSnapshot;
  price: number;
  technicalScore: number;
  ticker: string;
};

// buildValueScorecard creates Graham/Buffett style scores from live filing data when available, then local fallbacks.
export function buildValueScorecard({ candles, dividendYield, fundamentals: liveFundamentals, price, technicalScore, ticker }: ValueScoreInput): ValueScorecard {
  const fundamentals = buildScoringFundamentals({ candles, dividendYield, fundamentals: liveFundamentals, price, ticker });
  const graham = buildGrahamScore(fundamentals);
  const buffett = buildBuffettScore(fundamentals);
  const ownerScore = Math.round(graham.score * 0.42 + buffett.score * 0.48 + technicalScore * 0.1);

  return {
    buffett,
    dataConfidence: fundamentals.dataConfidence,
    graham,
    ownerGrade: scoreToGrade(ownerScore),
    ownerScore,
    technicalTimingWeight: Math.round(technicalScore * 0.1),
  };
}

// ScoringFundamentals stores normalized value inputs used by the Graham/Buffett scoring formulas.
type ScoringFundamentals = {
  bookValuePerShare: number;
  currentRatio: number;
  debtToEquity: number;
  earningsStability: number;
  eps: number;
  freeCashFlowYield: number;
  grossMargin: number;
  operatingMargin: number;
  peRatio: number;
  price: number;
  returnOnEquity: number;
  revenueGrowth: number;
  dataConfidence: ValueDataConfidence;
  sourceLabel: string;
};

// buildEstimatedFundamentals derives stable placeholder fundamentals from price history and ticker seed.
function buildEstimatedFundamentals({ candles, dividendYield, price, ticker }: Omit<ValueScoreInput, "fundamentals" | "technicalScore">): ScoringFundamentals {
  const seed = hashTicker(ticker);
  const closes = candles.map((candle) => candle.close);
  const firstClose = closes[0] ?? price;
  const volatility = calculateAverageMove(closes);
  const revenueGrowth = clamp((price - firstClose) / Math.max(firstClose, 1) / 2 + seededRange(seed + 3, -0.02, 0.12), -0.12, 0.2);
  const returnOnEquity = clamp(seededRange(seed + 5, 0.06, 0.32) - volatility * 1.5, 0.02, 0.38);
  const debtToEquity = clamp(seededRange(seed + 7, 0.05, 1.8) + volatility * 2, 0.02, 2.2);
  const currentRatio = clamp(seededRange(seed + 11, 0.75, 3.4) - debtToEquity * 0.12, 0.45, 3.5);
  const peRatio = clamp(seededRange(seed + 13, 7, 38) + volatility * 40 - dividendYield * 20, 4, 50);
  const eps = price / peRatio;
  const bookValuePerShare = price / clamp(seededRange(seed + 17, 0.9, 5.8), 0.8, 6);
  const freeCashFlowYield = clamp(seededRange(seed + 19, 0.01, 0.13) - volatility * 0.5, 0, 0.16);
  const earningsStability = clamp(1 - volatility * 12 + seededRange(seed + 23, -0.12, 0.12), 0, 1);
  const grossMargin = clamp(seededRange(seed + 29, 0.18, 0.72), 0.08, 0.8);
  const operatingMargin = clamp(grossMargin * seededRange(seed + 31, 0.22, 0.55), 0.02, 0.42);

  return {
    bookValuePerShare,
    currentRatio,
    debtToEquity,
    earningsStability,
    eps,
    freeCashFlowYield,
    grossMargin,
    operatingMargin,
    peRatio,
    price,
    returnOnEquity,
    revenueGrowth,
    dataConfidence: {
      description: "No usable provider fundamentals were available for this scan, so owner-score fundamentals are deterministic local estimates. Technical indicators still use the analyzer OHLC payload.",
      estimatedFields: 10,
      label: "Estimated",
      level: "estimated",
      providerFields: 0,
      totalFields: 10,
    },
    sourceLabel: "local deterministic estimates from mock OHLC until filing data exists",
  };
}

// buildScoringFundamentals merges real provider fundamentals with deterministic fallbacks.
function buildScoringFundamentals({ candles, dividendYield, fundamentals, price, ticker }: Omit<ValueScoreInput, "technicalScore">): ScoringFundamentals {
  const fallback = buildEstimatedFundamentals({ candles, dividendYield, price, ticker });

  if (!fundamentals) {
    return fallback;
  }

  const epsResult = chooseFundamental(safeDivide(fundamentals.netIncome, fundamentals.sharesOutstanding), fallback.eps);
  const peRatioResult = chooseFundamental(epsResult.fromProvider && epsResult.value > 0 ? price / epsResult.value : undefined, fallback.peRatio);
  const bookValueResult = chooseFundamental(
    fundamentals.bookValuePerShare ?? safeDivide(fundamentals.shareholderEquity, fundamentals.sharesOutstanding),
    fallback.bookValuePerShare,
  );
  const currentRatioResult = chooseFundamental(safeDivide(fundamentals.currentAssets, fundamentals.currentLiabilities), fallback.currentRatio);
  const debtToEquityResult = chooseFundamental(
    fundamentals.debtToEquity ?? safeDivide(fundamentals.longTermDebt, fundamentals.shareholderEquity),
    fallback.debtToEquity,
  );
  const returnOnEquityResult = chooseFundamental(
    fundamentals.returnOnEquity ?? safeDivide(fundamentals.netIncome, fundamentals.shareholderEquity),
    fallback.returnOnEquity,
  );
  const freeCashFlowPerShare = safeDivide(fundamentals.freeCashFlow, fundamentals.sharesOutstanding);
  const freeCashFlowYieldResult = chooseFundamental(freeCashFlowPerShare !== undefined ? freeCashFlowPerShare / Math.max(price, 1) : undefined, fallback.freeCashFlowYield);
  const grossMarginResult = chooseFundamental(safeDivide(fundamentals.grossProfit, fundamentals.revenue), fallback.grossMargin);
  const operatingMarginResult = chooseFundamental(safeDivide(fundamentals.operatingIncome, fundamentals.revenue), fallback.operatingMargin);
  const revenueGrowthResult = chooseFundamental(fundamentals.revenueGrowth, fallback.revenueGrowth);
  const dataConfidence = buildDataConfidence(fundamentals.source, [
    epsResult,
    peRatioResult,
    bookValueResult,
    currentRatioResult,
    debtToEquityResult,
    returnOnEquityResult,
    freeCashFlowYieldResult,
    grossMarginResult,
    operatingMarginResult,
    revenueGrowthResult,
  ]);

  return {
    ...fallback,
    bookValuePerShare: bookValueResult.value,
    currentRatio: currentRatioResult.value,
    dataConfidence,
    debtToEquity: debtToEquityResult.value,
    eps: epsResult.value,
    freeCashFlowYield: freeCashFlowYieldResult.value,
    grossMargin: grossMarginResult.value,
    operatingMargin: operatingMarginResult.value,
    peRatio: peRatioResult.value,
    returnOnEquity: returnOnEquityResult.value,
    revenueGrowth: revenueGrowthResult.value,
    sourceLabel: dataConfidence.description,
  };
}

// buildGrahamScore grades defensive value, balance-sheet strength, and margin of safety.
function buildGrahamScore(fundamentals: ScoringFundamentals): ValueScore {
  const grahamNumber = Math.sqrt(22.5 * fundamentals.eps * fundamentals.bookValuePerShare);
  const grahamDiscount = (grahamNumber - fundamentals.price) / Math.max(fundamentals.price, 1);
  const metrics: ValueMetric[] = [
    buildMetric({
      description: "Lower P/E means the stock price is cheaper compared with the company's earnings. Graham generally preferred reasonable prices, not exciting stories.",
      formula: withSource("P/E = Current share price / Earnings per share", fundamentals),
      label: "P/E Discipline",
      maxPoints: 25,
      points: scoreByThresholds(fundamentals.peRatio, [
        [12, 25],
        [18, 19],
        [25, 11],
        [35, 5],
      ]),
      value: formatRatio(fundamentals.peRatio),
    }),
    buildMetric({
      description: "Current ratio estimates short-term balance-sheet safety. A higher value means current assets are larger than current liabilities.",
      formula: withSource("Current ratio = Current assets / Current liabilities", fundamentals),
      label: "Current Ratio",
      maxPoints: 20,
      points: fundamentals.currentRatio >= 2 ? 20 : fundamentals.currentRatio >= 1.5 ? 14 : fundamentals.currentRatio >= 1 ? 8 : 2,
      value: formatRatio(fundamentals.currentRatio),
    }),
    buildMetric({
      description: "Debt-to-equity checks whether the company is leaning too hard on borrowed money. Graham preferred conservatively financed businesses.",
      formula: withSource("Debt-to-equity = Total debt / Shareholder equity", fundamentals),
      label: "Debt Control",
      maxPoints: 20,
      points: fundamentals.debtToEquity <= 0.5 ? 20 : fundamentals.debtToEquity <= 1 ? 14 : fundamentals.debtToEquity <= 1.5 ? 8 : 2,
      value: formatRatio(fundamentals.debtToEquity),
    }),
    buildMetric({
      description: "Graham Number is a classic estimate of a fair value ceiling using earnings and book value. A discount means price is below that estimate.",
      formula: withSource("Graham Number = square root of (22.5 x EPS x Book value per share)", fundamentals),
      label: "Margin of Safety",
      maxPoints: 25,
      points: grahamDiscount >= 0.25 ? 25 : grahamDiscount >= 0.05 ? 18 : grahamDiscount >= -0.15 ? 10 : 3,
      value: formatPercent(grahamDiscount),
    }),
    buildMetric({
      description: "Stable earnings reduce the chance that today's cheap price is hiding a deteriorating business.",
      formula: withSource("Earnings stability = local price-history volatility proxy until multi-year earnings data is stored", fundamentals),
      label: "Earnings Stability",
      maxPoints: 10,
      points: Math.round(fundamentals.earningsStability * 10),
      value: formatPercent(fundamentals.earningsStability),
    }),
  ];

  return buildValueScore("Graham Defensive", metrics, "Checks whether the stock looks conservatively priced and financially sturdy enough for a defensive value investor.");
}

// buildBuffettScore grades business quality, owner earnings, and moat-like durability.
function buildBuffettScore(fundamentals: ScoringFundamentals): ValueScore {
  const metrics: ValueMetric[] = [
    buildMetric({
      description: "Return on equity estimates how efficiently management turns shareholder capital into profit. Buffett tends to prefer high returns without excessive debt.",
      formula: withSource("ROE = Net income / Shareholder equity", fundamentals),
      label: "Return on Equity",
      maxPoints: 25,
      points: fundamentals.returnOnEquity >= 0.2 ? 25 : fundamentals.returnOnEquity >= 0.15 ? 19 : fundamentals.returnOnEquity >= 0.1 ? 12 : 5,
      value: formatPercent(fundamentals.returnOnEquity),
    }),
    buildMetric({
      description: "Free-cash-flow yield compares owner-like cash generation with the share price. Higher yield can mean a better deal if the business is durable.",
      formula: withSource("FCF yield = Free cash flow per share / Current share price", fundamentals),
      label: "Owner Cash Yield",
      maxPoints: 20,
      points: fundamentals.freeCashFlowYield >= 0.08 ? 20 : fundamentals.freeCashFlowYield >= 0.05 ? 15 : fundamentals.freeCashFlowYield >= 0.025 ? 9 : 3,
      value: formatPercent(fundamentals.freeCashFlowYield),
    }),
    buildMetric({
      description: "Margins are a rough moat proxy. Strong margins can suggest pricing power, brand strength, scale, or a better business model.",
      formula: withSource("Operating margin = Operating income / Revenue", fundamentals),
      label: "Margin Quality",
      maxPoints: 20,
      points: fundamentals.operatingMargin >= 0.22 ? 20 : fundamentals.operatingMargin >= 0.15 ? 15 : fundamentals.operatingMargin >= 0.08 ? 9 : 3,
      value: formatPercent(fundamentals.operatingMargin),
    }),
    buildMetric({
      description: "Revenue growth is not enough by itself, but steady growth gives a high-quality business more room to compound.",
      formula: withSource("Revenue growth = Recent revenue change / Prior revenue", fundamentals),
      label: "Growth Durability",
      maxPoints: 15,
      points: fundamentals.revenueGrowth >= 0.08 ? 15 : fundamentals.revenueGrowth >= 0.03 ? 11 : fundamentals.revenueGrowth >= 0 ? 7 : 2,
      value: formatPercent(fundamentals.revenueGrowth),
    }),
    buildMetric({
      description: "Buffett-style quality depends on strength without fragile leverage. This rewards companies that pair good returns with manageable debt.",
      formula: withSource("Quality leverage check = ROE score adjusted by debt-to-equity", fundamentals),
      label: "Low-Debt Quality",
      maxPoints: 20,
      points: fundamentals.debtToEquity <= 0.6 && fundamentals.returnOnEquity >= 0.15 ? 20 : fundamentals.debtToEquity <= 1 ? 14 : fundamentals.debtToEquity <= 1.5 ? 8 : 3,
      value: `${formatPercent(fundamentals.returnOnEquity)} ROE / ${formatRatio(fundamentals.debtToEquity)} D/E`,
    }),
  ];

  return buildValueScore("Buffett Quality", metrics, "Checks whether the stock resembles a durable, cash-generating business that might deserve long-term ownership.");
}

// chooseFundamental records whether one normalized scoring input came from provider data or fallback estimates.
function chooseFundamental(providerValue: number | undefined, fallbackValue: number) {
  if (providerValue !== undefined && Number.isFinite(providerValue)) {
    return {
      fromProvider: true,
      value: providerValue,
    };
  }

  return {
    fromProvider: false,
    value: fallbackValue,
  };
}

// buildDataConfidence summarizes provider coverage for the owner-score inputs.
function buildDataConfidence(provider: FundamentalSnapshot["source"], selectedInputs: Array<{ fromProvider: boolean }>): ValueDataConfidence {
  const totalFields = selectedInputs.length;
  const providerFields = selectedInputs.filter((input) => input.fromProvider).length;
  const estimatedFields = totalFields - providerFields;
  const level: ValueDataConfidence["level"] = providerFields === totalFields ? "provider" : providerFields > 0 ? "mixed" : "estimated";
  const label = level === "provider" ? "Provider-backed" : level === "mixed" ? "Mixed data" : "Estimated";

  return {
    description:
      level === "provider"
        ? `All owner-score fundamentals used by this scan came from ${provider}.`
        : level === "mixed"
          ? `${providerFields} of ${totalFields} owner-score fundamentals came from ${provider}; ${estimatedFields} missing inputs used deterministic local estimates.`
          : `No usable owner-score fundamentals came from ${provider}; this scan used deterministic local estimates.`,
    estimatedFields,
    label,
    level,
    provider,
    providerFields,
    totalFields,
  };
}

// withSource appends the data origin to each tooltip formula in plain English.
function withSource(formula: string, fundamentals: ScoringFundamentals) {
  return `${formula}. Data source: ${fundamentals.sourceLabel}.`;
}

// buildMetric returns one explainable metric row.
function buildMetric(metric: ValueMetric): ValueMetric {
  return metric;
}

// buildValueScore totals metrics and assigns a letter grade.
function buildValueScore(label: string, metrics: ValueMetric[], summary: string): ValueScore {
  const score = Math.min(100, Math.round(metrics.reduce((total, metric) => total + metric.points, 0)));

  return {
    grade: scoreToGrade(score),
    label,
    metrics,
    score,
    summary,
  };
}

// scoreByThresholds maps lower-is-better values to points.
function scoreByThresholds(value: number, thresholds: Array<[number, number]>) {
  for (const [maximum, points] of thresholds) {
    if (value <= maximum) {
      return points;
    }
  }

  return 1;
}

// safeDivide returns undefined for missing or zero denominator values so fallbacks can take over.
function safeDivide(numerator: number | undefined, denominator: number | undefined) {
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }

  return numerator / denominator;
}

// calculateAverageMove estimates volatility from close-to-close moves.
function calculateAverageMove(values: number[]) {
  if (values.length < 2) {
    return 0.02;
  }

  const moves = values.slice(1).map((value, index) => Math.abs(value - values[index]) / Math.max(values[index], 1));
  return moves.reduce((total, move) => total + move, 0) / moves.length;
}

// hashTicker converts a ticker into a repeatable numeric seed.
function hashTicker(ticker: string) {
  return ticker.split("").reduce((hash, character) => hash * 31 + character.charCodeAt(0), 17);
}

// seededRange produces deterministic pseudo-random values between min and max.
function seededRange(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const ratio = x - Math.floor(x);

  return min + ratio * (max - min);
}

// clamp limits a value to a useful scoring range.
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// scoreToGrade maps numeric scores to simple A-F grades.
function scoreToGrade(score: number): ValueScore["grade"] {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  if (score >= 60) {
    return "D";
  }

  return "F";
}

// formatRatio renders ratio values compactly.
function formatRatio(value: number) {
  return value.toFixed(2);
}

// formatPercent renders percentage values compactly.
function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    style: "percent",
  }).format(value);
}
