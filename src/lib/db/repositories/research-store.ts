import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db/connection";
import { analyzerScans, newsItems, watchlistItems } from "@/lib/db/schema";
import type { AnalyzerScan } from "@/lib/analyzer/types";
import type { FundamentalSnapshot, StockNewsItem } from "@/lib/external-data/types";

// saveAnalyzerScanSnapshot stores a complete scan for future ticker-click snapshot views.
export function saveAnalyzerScanSnapshot({
  fundamentals,
  news,
  scan,
}: {
  fundamentals?: FundamentalSnapshot;
  news?: StockNewsItem[];
  scan: AnalyzerScan;
}) {
  getDatabase()
    .insert(analyzerScans)
    .values({
      candlesJson: JSON.stringify(scan.candles),
      companyName: scan.companyName,
      createdAt: scan.scannedAt,
      dividendYield: scan.dividendYield,
      fundamentalsJson: fundamentals ? JSON.stringify(fundamentals) : null,
      grade: scan.grade,
      id: scan.id,
      metricsJson: JSON.stringify({
        macd: scan.macd,
        macdHistogram: scan.macdHistogram,
        macdSignal: scan.macdSignal,
        resistance20: scan.resistance20,
        rsi14: scan.rsi14,
        scoreBreakdown: scan.scoreBreakdown,
        sma50: scan.sma50,
        sma200: scan.sma200,
        support20: scan.support20,
      }),
      newsJson: news ? JSON.stringify(news) : null,
      price: scan.price,
      score: scan.score,
      source: scan.source,
      summary: scan.summary,
      ticker: scan.ticker,
    })
    .onConflictDoNothing()
    .run();
}

// getRecentAnalyzerScans returns the newest saved scan snapshots for one ticker.
export function getRecentAnalyzerScans(ticker: string, limit = 10) {
  return getDatabase()
    .select()
    .from(analyzerScans)
    .where(eq(analyzerScans.ticker, normalizeTicker(ticker)))
    .orderBy(desc(analyzerScans.createdAt))
    .limit(limit)
    .all();
}

// getAnalyzerScanById returns one saved scan row by primary key.
export function getAnalyzerScanById(id: string) {
  return getDatabase().select().from(analyzerScans).where(eq(analyzerScans.id, id)).get();
}

// upsertWatchlistItem saves a ticker in the local database-backed watchlist.
export function upsertWatchlistItem({
  companyName,
  latestScanId,
  notes,
  ticker,
}: {
  companyName?: string;
  latestScanId?: string;
  notes?: string;
  ticker: string;
}) {
  const now = new Date().toISOString();
  const normalizedTicker = normalizeTicker(ticker);

  getDatabase()
    .insert(watchlistItems)
    .values({
      addedAt: now,
      companyName,
      latestScanId,
      notes,
      ticker: normalizedTicker,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        companyName,
        latestScanId,
        notes,
        updatedAt: now,
      },
      target: watchlistItems.ticker,
    })
    .run();
}

// listWatchlistItems returns every database-backed watchlist row, newest updated first.
export function listWatchlistItems() {
  return getDatabase().select().from(watchlistItems).orderBy(desc(watchlistItems.updatedAt)).all();
}

// deleteWatchlistItem removes one database-backed watchlist row.
export function deleteWatchlistItem(ticker: string) {
  getDatabase().delete(watchlistItems).where(eq(watchlistItems.ticker, normalizeTicker(ticker))).run();
}

// saveNewsItems stores ticker headlines so news refreshes can respect cache windows.
export function saveNewsItems(ticker: string, items: StockNewsItem[]) {
  const normalizedTicker = normalizeTicker(ticker);
  const now = new Date().toISOString();

  items.forEach((item) => {
    getDatabase()
      .insert(newsItems)
      .values({
        createdAt: now,
        id: buildNewsId(normalizedTicker, item.url || item.title),
        publishedAt: item.publishedAt ?? null,
        source: item.source,
        sourceName: item.sourceName ?? null,
        summary: item.summary ?? null,
        ticker: normalizedTicker,
        title: item.title,
        url: item.url,
      })
      .onConflictDoNothing()
      .run();
  });
}

// getLatestNewsItems returns saved headlines for one ticker.
export function getLatestNewsItems(ticker: string, limit = 10) {
  return getDatabase()
    .select()
    .from(newsItems)
    .where(eq(newsItems.ticker, normalizeTicker(ticker)))
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit)
    .all();
}

// buildNewsId creates a stable primary key for one ticker/headline URL.
function buildNewsId(ticker: string, value: string) {
  return createHash("sha256").update(`${ticker}:${value}`).digest("hex");
}

// normalizeTicker keeps stored ticker keys consistent.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
