import { NextResponse } from "next/server";
import { getFmpQuote } from "@/lib/external-data/providers/fmp-provider";

// POST refreshes one ticker quote through FMP only so manual clicks do not spend Twelve Data calls.
export async function POST(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const normalizedTicker = ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);

  if (!normalizedTicker) {
    return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
  }

  try {
    const quote = await getFmpQuote(normalizedTicker, { forceRefresh: true });

    if (!quote) {
      return NextResponse.json({ error: `FMP did not return a usable quote for ${normalizedTicker}.` }, { status: 404 });
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      price: quote.price,
      provider: quote.source,
      ticker: quote.ticker,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : `Unable to refresh ${normalizedTicker} through FMP.`,
        ticker: normalizedTicker,
      },
      { status: 502 },
    );
  }
}
