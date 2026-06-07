import { NextResponse } from "next/server";
import {
  deleteWatchlistItem,
  getAnalyzerScanById,
  listWatchlistItems,
  upsertWatchlistItem,
} from "@/lib/db/repositories/research-store";

// GET returns database-backed watchlist items enriched with latest scan data when available.
export function GET() {
  const items = listWatchlistItems().map((item) => {
    const scan = item.latestScanId ? getAnalyzerScanById(item.latestScanId) : null;

    return {
      addedAt: item.addedAt,
      companyName: scan?.companyName ?? item.companyName ?? item.ticker,
      dividendYield: scan?.dividendYield ?? 0,
      grade: scan?.grade ?? "F",
      lastScannedAt: scan?.createdAt ?? item.updatedAt,
      latestScanId: item.latestScanId ?? `${item.ticker}-db`,
      price: scan?.price ?? 0,
      score: scan?.score ?? 0,
      source: scan?.source ?? "mock",
      ticker: item.ticker,
    };
  });

  return NextResponse.json({ items });
}

// POST upserts one watchlist item in SQLite.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    companyName?: string;
    latestScanId?: string;
    notes?: string;
    ticker?: string;
  } | null;
  const ticker = normalizeTicker(body?.ticker ?? "");

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  upsertWatchlistItem({
    companyName: body?.companyName,
    latestScanId: body?.latestScanId,
    notes: body?.notes,
    ticker,
  });

  return NextResponse.json({ saved: true, ticker });
}

// DELETE removes one watchlist item from SQLite.
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => null) as { ticker?: string } | null;
  const ticker = normalizeTicker(body?.ticker ?? url.searchParams.get("ticker") ?? "");

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  deleteWatchlistItem(ticker);

  return NextResponse.json({ deleted: true, ticker });
}

// normalizeTicker keeps route inputs consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
