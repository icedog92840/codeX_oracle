import { NextResponse } from "next/server";
import { getLatestNewsItems, getRecentAnalyzerScans } from "@/lib/db/repositories/research-store";

// GET returns a saved scan snapshot plus locally cached news for one ticker.
export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  if (!normalizedTicker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  const scans = getRecentAnalyzerScans(normalizedTicker, 8).map((scan) => ({
    candleCount: parseJsonArray(scan.candlesJson).length,
    companyName: scan.companyName,
    createdAt: scan.createdAt,
    dividendYield: scan.dividendYield ?? 0,
    grade: scan.grade,
    id: scan.id,
    metrics: parseJsonObject(scan.metricsJson),
    price: scan.price,
    score: scan.score,
    source: scan.source,
    summary: scan.summary,
    ticker: scan.ticker,
  }));
  const news = getLatestNewsItems(normalizedTicker, 8).map((item) => ({
    cachedAt: item.createdAt,
    publishedAt: item.publishedAt,
    source: item.source,
    sourceName: item.sourceName,
    summary: item.summary,
    title: item.title,
    url: item.url,
  }));

  return NextResponse.json({
    latestScan: scans[0] ?? null,
    news,
    scans,
    ticker: normalizedTicker,
  });
}

// parseJsonArray safely parses a JSON array string.
function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// parseJsonObject safely parses a JSON object string.
function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// normalizeTicker keeps route inputs consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
