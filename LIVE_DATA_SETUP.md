# Live Data Setup

The app is local-first. Live provider calls are disabled unless the matching environment variables are present.

## Recommended Free Stack

- Twelve Data: quotes and daily OHLC candles.
- SEC EDGAR: company facts and value-investor fundamentals.
- Financial Modeling Prep: optional fallback quote/news provider.
- Alpha Vantage: optional fallback daily OHLC provider with a very small free daily budget.
- RSS: optional configurable headline feed.

## Environment Variables

Create `.env.local` locally. Do not commit it.

```text
TWELVE_DATA_API_KEY=
SEC_EDGAR_USER_AGENT=Your Name your-email@example.com
FMP_API_KEY=
ALPHA_VANTAGE_API_KEY=
STOCK_NEWS_RSS_URL_TEMPLATE=
CODEX_ORACLE_DB_PATH=
```

`STOCK_NEWS_RSS_URL_TEMPLATE` should include `{ticker}` where the symbol belongs.

## Cache And Rate Safety

External provider data is cached in SQLite under `.data/codex-oracle.db` by default.

Current TTLs:

- Quotes: 10 minutes
- Historical OHLC: 12 hours
- News: 30 minutes
- SEC company facts: 7 days
- SEC ticker index: 30 days

Local request counters are also stored in SQLite.

Configured guardrails:

- Twelve Data: 8 requests per minute, 800 per day
- Alpha Vantage: 5 requests per minute, 25 per day
- FMP: 20 requests per minute, 250 per day
- SEC EDGAR: 300 requests per minute, 5000 per day
- RSS: 30 requests per minute, 1000 per day

## Server API

The browser should call:

```text
/api/research/AAPL
```

That route keeps API keys on the server and returns a cached research snapshot:

- quote
- OHLC candles
- SEC fundamentals
- news headlines

If a provider is not configured, it returns only the data available from configured providers.

## SQLite Storage

The local database is ignored by Git and can store:

- provider cache responses
- API usage counters
- analyzer scan snapshots
- database-backed watchlist rows
- ticker news items
- CSV import fingerprints
- app settings

Analyzer scans and watchlist add/remove actions are mirrored through:

```text
/api/analyzer/scans
/api/watchlist
```

## Analyzer Direction

The analyzer currently combines:

- Graham Defensive Grade
- Buffett Quality Grade
- Technical Timing Grade
- News/filing context

The Graham/Buffett inputs are deterministic local estimates until SEC/FMP fundamentals are wired into the scan payload. Technical indicators are kept as a small timing layer, not the main owner-grade score.
