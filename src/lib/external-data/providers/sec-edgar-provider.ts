import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
import { buildSourceFreshness } from "@/lib/external-data/freshness";
import type { FundamentalSnapshot } from "@/lib/external-data/types";

// SecTickerIndexResponse is SEC's company_tickers.json object shape.
type SecTickerIndexResponse = Record<string, {
  cik_str: number;
  ticker: string;
  title: string;
}>;

// SecCompanyFactsResponse contains XBRL facts grouped by taxonomy and tag.
type SecCompanyFactsResponse = {
  facts?: {
    dei?: Record<string, SecFact>;
    "us-gaap"?: Record<string, SecFact>;
  };
};

// SecFact stores unit-grouped fact rows for one XBRL tag.
type SecFact = {
  units?: Record<string, SecFactRow[]>;
};

// SecFactRow stores one dated fact value.
type SecFactRow = {
  end?: string;
  filed?: string;
  fp?: string;
  form?: string;
  fy?: number;
  start?: string;
  val?: number;
};

// getSecFundamentals derives value-investor metrics from SEC companyfacts when configured.
export async function getSecFundamentals(ticker: string, options: { forceRefresh?: boolean } = {}): Promise<FundamentalSnapshot | null> {
  const availability = getProviderAvailability("sec-edgar");

  if (!availability.enabled) {
    return null;
  }

  const symbol = normalizeTicker(ticker);
  const cik = await getCikForTicker(symbol);

  if (!cik) {
    return null;
  }

  const paddedCik = String(cik).padStart(10, "0");
  const response = await fetchJsonWithCache<SecCompanyFactsResponse>({
    budget: freeApiBudgets.secEdgar,
    cacheParts: { cik: paddedCik },
    endpoint: "companyfacts",
    forceRefresh: options.forceRefresh,
    headers: getSecHeaders(),
    provider: "sec-edgar",
    ttlMs: cacheTtls.companyFacts,
    url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`,
  });

  return {
    ...buildFundamentalSnapshot(symbol, response.data),
    freshness: buildSourceFreshness(response),
  };
}

// getCikForTicker maps a ticker to its SEC CIK using the cached SEC ticker index.
async function getCikForTicker(ticker: string) {
  const response = await fetchJsonWithCache<SecTickerIndexResponse>({
    budget: freeApiBudgets.secEdgar,
    cacheParts: { index: "company_tickers" },
    endpoint: "company_tickers",
    headers: getSecHeaders(),
    provider: "sec-edgar",
    ttlMs: cacheTtls.tickerIndex,
    url: "https://www.sec.gov/files/company_tickers.json",
  });

  return Object.values(response.data).find((company) => company.ticker.toUpperCase() === ticker)?.cik_str ?? null;
}

// buildFundamentalSnapshot extracts latest annual-ish facts and computes simple ratios.
function buildFundamentalSnapshot(ticker: string, data: SecCompanyFactsResponse): FundamentalSnapshot {
  const gaap = data.facts?.["us-gaap"] ?? {};
  const dei = data.facts?.dei ?? {};
  const revenueFact = selectNewestAnnualFact(gaap.RevenueFromContractWithCustomerExcludingAssessedTax, gaap.Revenues);
  const revenue = latestAnnualUsd(revenueFact);
  const [latestRevenue, priorRevenue] = latestAnnualUsdValues(revenueFact, 2);
  const revenueGrowth = latestRevenue !== undefined && priorRevenue ? (latestRevenue - priorRevenue) / Math.abs(priorRevenue) : undefined;
  const netIncomeFact = gaap.NetIncomeLoss;
  const annualNetIncomeValues = latestAnnualUsdValues(netIncomeFact, 5);
  const currentAssets = latestUsd(gaap.AssetsCurrent);
  const currentLiabilities = latestUsd(gaap.LiabilitiesCurrent);
  const grossProfit = latestAnnualUsd(gaap.GrossProfit);
  const netIncome = annualNetIncomeValues[0];
  const operatingIncome = latestAnnualUsd(gaap.OperatingIncomeLoss);
  const totalAssets = latestUsd(gaap.Assets);
  const totalLiabilities = latestUsd(gaap.Liabilities);
  const shareholderEquity = latestUsd(gaap.StockholdersEquity);
  const longTermDebt = latestUsd(gaap.LongTermDebtNoncurrent) ?? latestUsd(gaap.LongTermDebt);
  const operatingCashFlow = latestAnnualUsd(gaap.NetCashProvidedByUsedInOperatingActivities);
  const capitalExpenditures = latestAnnualUsd(gaap.PaymentsToAcquirePropertyPlantAndEquipment);
  const sharesOutstanding = latestShares(dei.EntityCommonStockSharesOutstanding);
  const freeCashFlow = operatingCashFlow !== undefined && capitalExpenditures !== undefined ? operatingCashFlow - Math.abs(capitalExpenditures) : undefined;
  const bookValuePerShare = shareholderEquity !== undefined && sharesOutstanding ? shareholderEquity / sharesOutstanding : undefined;
  const returnOnEquity = netIncome !== undefined && shareholderEquity ? netIncome / shareholderEquity : undefined;
  const debtToEquity = longTermDebt !== undefined && shareholderEquity ? longTermDebt / shareholderEquity : undefined;
  const earningsStability = calculateEarningsStability(annualNetIncomeValues);

  return {
    bookValuePerShare,
    capitalExpenditures,
    currentAssets,
    currentLiabilities,
    debtToEquity,
    earningsStability,
    freeCashFlow,
    grossProfit,
    longTermDebt,
    netIncome,
    operatingIncome,
    operatingCashFlow,
    returnOnEquity,
    revenue,
    revenueGrowth,
    shareholderEquity,
    sharesOutstanding,
    source: "sec-edgar",
    ticker,
    totalAssets,
    totalLiabilities,
  };
}

// latestUsd returns the newest USD fact value by fiscal end and filed date.
function latestUsd(fact: SecFact | undefined) {
  return latestValue(fact?.units?.USD);
}

// latestAnnualUsd returns the newest annual USD fact for income and cash-flow metrics.
function latestAnnualUsd(fact: SecFact | undefined) {
  return latestAnnualValues(fact?.units?.USD, 1)[0];
}

// latestAnnualUsdValues returns same-duration annual USD values for growth comparisons.
function latestAnnualUsdValues(fact: SecFact | undefined, count: number) {
  return latestAnnualValues(fact?.units?.USD, count);
}

// latestShares returns the newest shares fact value.
function latestShares(fact: SecFact | undefined) {
  return latestValue(fact?.units?.shares);
}

// latestValue sorts fact rows by period end and filing date, then returns the newest value.
function latestValue(rows: SecFactRow[] | undefined) {
  const latest = latestValues(rows, 1)[0];

  return latest;
}

// latestValues sorts fact rows by period end and filing date, then returns newest numeric values.
function latestValues(rows: SecFactRow[] | undefined, count: number) {
  return rows
    ?.filter((row) => typeof row.val === "number" && row.form !== "8-K")
    .sort((left, right) => `${right.end ?? ""}${right.filed ?? ""}`.localeCompare(`${left.end ?? ""}${left.filed ?? ""}`))
    .filter((row, index, sortedRows) => sortedRows.findIndex((candidate) => candidate.end === row.end) === index)
    .slice(0, count)
    .map((row) => row.val as number) ?? [];
}

// latestAnnualValues filters out quarterly duration facts so annual ratios compare like periods.
function latestAnnualValues(rows: SecFactRow[] | undefined, count: number) {
  return rows
    ?.filter((row) => typeof row.val === "number" && row.form !== "8-K" && isAnnualDuration(row))
    .sort((left, right) => `${right.end ?? ""}${right.filed ?? ""}`.localeCompare(`${left.end ?? ""}${left.filed ?? ""}`))
    .filter((row, index, sortedRows) => sortedRows.findIndex((candidate) => annualFactKey(candidate) === annualFactKey(row)) === index)
    .slice(0, count)
    .map((row) => row.val as number) ?? [];
}

// selectNewestAnnualFact chooses the revenue tag that has the most recent annual fact rows.
function selectNewestAnnualFact(...facts: Array<SecFact | undefined>) {
  return facts
    .filter((fact): fact is SecFact => Boolean(fact))
    .sort((left, right) => getNewestAnnualEnd(right).localeCompare(getNewestAnnualEnd(left)))[0];
}

// getNewestAnnualEnd returns the newest annual period end for one SEC fact.
function getNewestAnnualEnd(fact: SecFact) {
  return fact.units?.USD
    ?.filter((row) => typeof row.val === "number" && row.form !== "8-K" && isAnnualDuration(row))
    .sort((left, right) => `${right.end ?? ""}${right.filed ?? ""}`.localeCompare(`${left.end ?? ""}${left.filed ?? ""}`))[0]?.end ?? "";
}

// isAnnualDuration checks whether a fact spans roughly one fiscal year instead of a quarter.
function isAnnualDuration(row: SecFactRow) {
  if (!row.start || !row.end) {
    return row.form === "10-K" && row.fp === "FY";
  }

  const startTime = new Date(row.start).getTime();
  const endTime = new Date(row.end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return false;
  }

  const durationDays = (endTime - startTime) / 86_400_000;
  return durationDays >= 300;
}

// annualFactKey deduplicates annual rows that share the same fiscal year or period end.
function annualFactKey(row: SecFactRow) {
  return row.fy !== undefined ? `${row.fy}` : row.end ?? "";
}

// calculateEarningsStability converts multi-year net income history into a 0-1 consistency score.
function calculateEarningsStability(values: number[]) {
  if (values.length < 3) {
    return undefined;
  }

  const positiveRatio = values.filter((value) => value > 0).length / values.length;
  const changes = values.slice(0, -1).map((value, index) => Math.abs(value - values[index + 1]) / Math.max(Math.abs(values[index + 1]), 1));
  const averageChange = changes.reduce((total, value) => total + value, 0) / changes.length;

  return clamp(positiveRatio - averageChange * 0.35, 0, 1);
}

// clamp limits derived SEC metrics to their expected display/scoring range.
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// getSecHeaders provides the required SEC User-Agent contact string.
function getSecHeaders() {
  return {
    "User-Agent": process.env.SEC_EDGAR_USER_AGENT ?? "",
  };
}

// normalizeTicker keeps provider requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
