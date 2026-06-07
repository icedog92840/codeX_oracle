# Live Data Setup

The app is local-first. Live provider calls are disabled unless the matching environment variables are present.

## Recommended Free Stack

- Twelve Data: quotes and daily OHLC candles for analyzer scans.
- SEC EDGAR: company facts and value-investor fundamentals.
- Financial Modeling Prep: recommended first news provider and optional quote fallback.
- Alpha Vantage: optional fallback daily OHLC provider with a very small free daily budget.
- RSS: optional configurable headline feed.

## Environment Variables

Copy `.env.example` to `.env.local`, paste only the keys you want to use, then restart the dev server. Do not commit `.env.local`.

```text
SEC_EDGAR_USER_AGENT=Your Name your-email@example.com
TWELVE_DATA_API_KEY=
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

## Provider Endpoint Map

The code is key-ready for these provider paths:

- SEC EDGAR fundamentals: `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`
- Twelve Data quote: `https://api.twelvedata.com/quote`
- Twelve Data daily candles: `https://api.twelvedata.com/time_series?interval=1day`
- FMP quote fallback: `https://financialmodelingprep.com/stable/quote`
- FMP ticker news: `https://financialmodelingprep.com/stable/news/stock`
- Alpha Vantage OHLC fallback: `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY`
- RSS fallback: `STOCK_NEWS_RSS_URL_TEMPLATE` with `{ticker}` replaced by the ticker symbol.

## Server API

The browser should call:

```text
/api/research/AAPL
```

To force a budget-guarded provider refresh:

```text
/api/research/AAPL?refresh=1
```

That route keeps API keys on the server and returns a cached research snapshot:

- quote
- OHLC candles
- SEC fundamentals
- news headlines

If a provider is not configured, it returns only the data available from configured providers.

The `/data-providers` page includes a Research Test Harness that calls this route from the browser and summarizes quote, OHLC, fundamentals, news, source tags, and cache freshness. Use **Test** for cache-first checks and **Refresh** after keys are added to force a budget-guarded provider refresh.

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

The Graham/Buffett inputs now use SEC fundamentals when configured and fall back to deterministic local estimates for missing fields. Technical indicators are kept as a small timing layer, not the main owner-grade score.

Analyzer OHLC is research-first: it uses cached provider candles from `/api/research/[ticker]` when available and falls back to deterministic local candles when providers are missing or return too little usable history.
