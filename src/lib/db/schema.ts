import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// providerCache stores cached external API responses so free-tier calls are reused until stale.
export const providerCache = sqliteTable(
  "provider_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    createdAt: text("created_at").notNull(),
    dataJson: text("data_json").notNull(),
    expiresAt: text("expires_at").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    provider: text("provider").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    expiresAtIdx: index("provider_cache_expires_at_idx").on(table.expiresAt),
    providerIdx: index("provider_cache_provider_idx").on(table.provider),
  }),
);

// apiUsage stores local per-provider request counters for free-tier safety.
export const apiUsage = sqliteTable("api_usage", {
  day: text("day").notNull(),
  dayCount: integer("day_count").notNull().default(0),
  minute: text("minute").notNull(),
  minuteCount: integer("minute_count").notNull().default(0),
  provider: text("provider").primaryKey(),
  updatedAt: text("updated_at").notNull(),
});

// analyzerScans stores full analyzer snapshots for future ticker-click history views.
export const analyzerScans = sqliteTable(
  "analyzer_scans",
  {
    candlesJson: text("candles_json").notNull(),
    companyName: text("company_name").notNull(),
    createdAt: text("created_at").notNull(),
    dividendYield: real("dividend_yield"),
    fundamentalsJson: text("fundamentals_json"),
    grade: text("grade").notNull(),
    id: text("id").primaryKey(),
    metricsJson: text("metrics_json").notNull(),
    newsJson: text("news_json"),
    price: real("price").notNull(),
    score: integer("score").notNull(),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    ticker: text("ticker").notNull(),
  },
  (table) => ({
    createdAtIdx: index("analyzer_scans_created_at_idx").on(table.createdAt),
    tickerIdx: index("analyzer_scans_ticker_idx").on(table.ticker),
  }),
);

// watchlistItems stores saved tickers outside browser localStorage once the UI is migrated.
export const watchlistItems = sqliteTable(
  "watchlist_items",
  {
    addedAt: text("added_at").notNull(),
    companyName: text("company_name"),
    latestScanId: text("latest_scan_id"),
    notes: text("notes"),
    ticker: text("ticker").primaryKey(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    updatedAtIdx: index("watchlist_items_updated_at_idx").on(table.updatedAt),
  }),
);

// newsItems stores ticker-related headlines so watchlist news does not repeatedly hit providers.
export const newsItems = sqliteTable(
  "news_items",
  {
    createdAt: text("created_at").notNull(),
    id: text("id").primaryKey(),
    publishedAt: text("published_at"),
    source: text("source").notNull(),
    sourceName: text("source_name"),
    summary: text("summary"),
    ticker: text("ticker").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
  },
  (table) => ({
    publishedAtIdx: index("news_items_published_at_idx").on(table.publishedAt),
    tickerIdx: index("news_items_ticker_idx").on(table.ticker),
    urlIdx: index("news_items_url_idx").on(table.url),
  }),
);

// csvImports stores source-file fingerprints so CSV parsing can later skip unchanged imports.
export const csvImports = sqliteTable("csv_imports", {
  fileHash: text("file_hash").primaryKey(),
  importedAt: text("imported_at").notNull(),
  latestActivityDate: text("latest_activity_date"),
  rowCount: integer("row_count").notNull(),
  sourcePath: text("source_path").notNull(),
});

// appSettings stores local feature flags and provider choices without committing user preferences.
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  updatedAt: text("updated_at").notNull(),
  valueJson: text("value_json").notNull(),
});
