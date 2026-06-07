import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

// DbClient bundles the raw SQLite handle with the typed Drizzle client.
type DbClient = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: Database.Database;
};

declare global {
  var codexOracleDbClient: DbClient | undefined;
}

// getDatabase returns the singleton Drizzle client for local SQLite persistence.
export function getDatabase() {
  return getDbClient().db;
}

// getSqlite returns the raw SQLite handle for schema bootstrap and rare low-level operations.
export function getSqlite() {
  return getDbClient().sqlite;
}

// getDatabasePath returns the local SQLite file path. It is ignored by git through `.data/`.
export function getDatabasePath() {
  return process.env.CODEX_ORACLE_DB_PATH ?? join(process.cwd(), ".data", "codex-oracle.db");
}

// getDbClient initializes the database once per server process.
function getDbClient(): DbClient {
  if (globalThis.codexOracleDbClient) {
    return globalThis.codexOracleDbClient;
  }

  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  ensureDatabaseSchema(sqlite);

  globalThis.codexOracleDbClient = {
    db: drizzle(sqlite, { schema }),
    sqlite,
  };

  return globalThis.codexOracleDbClient;
}

// ensureDatabaseSchema creates the local tables without requiring a separate migration command.
function ensureDatabaseSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS provider_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      data_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS provider_cache_provider_idx ON provider_cache (provider);
    CREATE INDEX IF NOT EXISTS provider_cache_expires_at_idx ON provider_cache (expires_at);

    CREATE TABLE IF NOT EXISTS api_usage (
      provider TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      day_count INTEGER NOT NULL DEFAULT 0,
      minute TEXT NOT NULL,
      minute_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyzer_scans (
      id TEXT PRIMARY KEY NOT NULL,
      ticker TEXT NOT NULL,
      company_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL,
      price REAL NOT NULL,
      dividend_yield REAL,
      score INTEGER NOT NULL,
      grade TEXT NOT NULL,
      summary TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      candles_json TEXT NOT NULL,
      fundamentals_json TEXT,
      news_json TEXT
    );

    CREATE INDEX IF NOT EXISTS analyzer_scans_ticker_idx ON analyzer_scans (ticker);
    CREATE INDEX IF NOT EXISTS analyzer_scans_created_at_idx ON analyzer_scans (created_at);

    CREATE TABLE IF NOT EXISTS watchlist_items (
      ticker TEXT PRIMARY KEY NOT NULL,
      company_name TEXT,
      added_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      latest_scan_id TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS watchlist_items_updated_at_idx ON watchlist_items (updated_at);

    CREATE TABLE IF NOT EXISTS news_items (
      id TEXT PRIMARY KEY NOT NULL,
      ticker TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at TEXT,
      source TEXT NOT NULL,
      source_name TEXT,
      summary TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS news_items_ticker_idx ON news_items (ticker);
    CREATE INDEX IF NOT EXISTS news_items_url_idx ON news_items (url);
    CREATE INDEX IF NOT EXISTS news_items_published_at_idx ON news_items (published_at);

    CREATE TABLE IF NOT EXISTS csv_imports (
      file_hash TEXT PRIMARY KEY NOT NULL,
      source_path TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      latest_activity_date TEXT,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
