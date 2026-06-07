import { NextResponse } from "next/server";
import { getStockResearchSnapshot } from "@/lib/external-data/stock-research-service";

// GET returns a cached stock research snapshot for one ticker without exposing provider keys to the browser.
export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const normalizedTicker = ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);

  if (!normalizedTicker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  try {
    const snapshot = await getStockResearchSnapshot(normalizedTicker);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load stock research data.",
        ticker: normalizedTicker,
      },
      { status: 502 },
    );
  }
}
