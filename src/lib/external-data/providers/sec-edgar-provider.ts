import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchJsonWithCache } from "@/lib/external-data/http-client";
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
  form?: string;
  fy?: number;
  val?: number;
};

// getSecFundamentals derives value-investor metrics from SEC companyfacts when configured.
export async function getSecFundamentals(ticker: string): Promise<FundamentalSnapshot | null> {
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
    headers: getSecHeaders(),
    provider: "sec-edgar",
    ttlMs: cacheTtls.companyFacts,
    url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`,
  });

  return buildFundamentalSnapshot(symbol, response.data);
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
  const revenue = latestUsd(gaap.Revenues) ?? latestUsd(gaap.RevenueFromContractWithCustomerExcludingAssessedTax);
  const netIncome = latestUsd(gaap.NetIncomeLoss);
  const totalAssets = latestUsd(gaap.Assets);
  const totalLiabilities = latestUsd(gaap.Liabilities);
  const shareholderEquity = latestUsd(gaap.StockholdersEquity);
  const longTermDebt = latestUsd(gaap.LongTermDebtNoncurrent) ?? latestUsd(gaap.LongTermDebt);
  const operatingCashFlow = latestUsd(gaap.NetCashProvidedByUsedInOperatingActivities);
  const capitalExpenditures = latestUsd(gaap.PaymentsToAcquirePropertyPlantAndEquipment);
  const sharesOutstanding = latestShares(dei.EntityCommonStockSharesOutstanding);
  const freeCashFlow = operatingCashFlow !== undefined && capitalExpenditures !== undefined ? operatingCashFlow - Math.abs(capitalExpenditures) : undefined;
  const bookValuePerShare = shareholderEquity !== undefined && sharesOutstanding ? shareholderEquity / sharesOutstanding : undefined;
  const returnOnEquity = netIncome !== undefined && shareholderEquity ? netIncome / shareholderEquity : undefined;
  const debtToEquity = longTermDebt !== undefined && shareholderEquity ? longTermDebt / shareholderEquity : undefined;

  return {
    bookValuePerShare,
    capitalExpenditures,
    debtToEquity,
    freeCashFlow,
    longTermDebt,
    netIncome,
    operatingCashFlow,
    returnOnEquity,
    revenue,
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

// latestShares returns the newest shares fact value.
function latestShares(fact: SecFact | undefined) {
  return latestValue(fact?.units?.shares);
}

// latestValue sorts fact rows by period end and filing date, then returns the newest value.
function latestValue(rows: SecFactRow[] | undefined) {
  const latest = rows
    ?.filter((row) => typeof row.val === "number" && row.form !== "8-K")
    .sort((left, right) => `${right.end ?? ""}${right.filed ?? ""}`.localeCompare(`${left.end ?? ""}${left.filed ?? ""}`))[0];

  return latest?.val;
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
