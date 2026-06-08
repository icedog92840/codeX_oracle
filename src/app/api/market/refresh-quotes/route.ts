import { NextResponse } from "next/server";
import { refreshPortfolioQuotes } from "@/lib/market-data/portfolio-quote-refresh";

// POST refreshes lightweight quote cache for every currently open portfolio holding.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1" || url.searchParams.get("refresh") === "true";

  try {
    const result = await refreshPortfolioQuotes({ forceRefresh });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to refresh portfolio quotes.",
      },
      { status: 502 },
    );
  }
}
