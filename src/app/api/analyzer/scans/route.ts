import { NextResponse } from "next/server";
import type { AnalyzerScan } from "@/lib/analyzer/types";
import { getRecentAnalyzerScans, saveAnalyzerScanSnapshot } from "@/lib/db/repositories/research-store";

// GET returns recent saved analyzer scans for a ticker from SQLite.
export function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = normalizeTicker(url.searchParams.get("ticker") ?? "");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 25);

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  return NextResponse.json({
    scans: getRecentAnalyzerScans(ticker, Number.isNaN(limit) ? 10 : limit),
    ticker,
  });
}

// POST stores one completed analyzer scan snapshot in SQLite.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { scan?: AnalyzerScan } | null;
  const scan = body?.scan;

  if (!isAnalyzerScanPayload(scan)) {
    return NextResponse.json({ error: "Valid analyzer scan payload is required." }, { status: 400 });
  }

  saveAnalyzerScanSnapshot({ scan });

  return NextResponse.json({
    id: scan.id,
    saved: true,
    ticker: scan.ticker,
  });
}

// isAnalyzerScanPayload checks the minimum scan shape needed before saving to SQLite.
function isAnalyzerScanPayload(value: unknown): value is AnalyzerScan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scan = value as Partial<AnalyzerScan>;

  return Boolean(
    typeof scan.id === "string" &&
      typeof scan.ticker === "string" &&
      typeof scan.companyName === "string" &&
      typeof scan.scannedAt === "string" &&
      typeof scan.price === "number" &&
      typeof scan.score === "number" &&
      typeof scan.grade === "string" &&
      typeof scan.summary === "string" &&
      Array.isArray(scan.candles) &&
      scan.scoreBreakdown,
  );
}

// normalizeTicker keeps route query values consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
