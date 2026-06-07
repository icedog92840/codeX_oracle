# codeX Oracle

Compact local financial portfolio dashboard built with Next.js, React, Tailwind CSS, and shadcn/ui patterns.

## Current Status

The app is past the original Version 1.0 baseline and is currently tagged at `v1.2-market-provider-qa`.

- Next.js App Router, React, Tailwind CSS, and shadcn-compatible UI primitives.
- Dark mobile-friendly fintech theme based on the uploaded dashboard reference image.
- CSV-backed dashboard, dividends, DRIP visualizer, transactions, and stock analyzer routes.
- Local Robinhood CSV parsing from `Transaction_Log.csv` in the project root.
- Portfolio holdings, weighting, unrealized P/L, dividends paid, and PADI calculations.
- Dividend matrix, dividend cards, payout charts, DRIP metrics, and historical payout popouts.
- Paged/filterable transaction verification with mobile stacked cards.
- Local mock-OHLC stock analyzer with technical indicators, Graham/Buffett owner scoring, SQLite-backed watchlist mirroring, and saved scan snapshot drawer.
- Isolated market-data provider resolver for future live stock price and dividend yield APIs.
- Isolated analyzer-data provider resolver for future live historical OHLC APIs.
- Server-only external-data scaffolding with SQLite cache, free-tier budgets, and `/api/research/[ticker]`.

## Data Sources

- `Transaction_Log.csv`: Parsed dynamically on server-rendered routes for holdings, dividends, DRIP, transactions, and dashboard calculations.
- Market prices/yields: Local placeholders only. The provider interface lives in `src/lib/market-data`.
- Analyzer OHLC candles: Deterministic local mock data only. The provider interface lives in `src/lib/analyzer`. No external indicator API is used.
- Analyzer value metrics: Deterministic local estimates until SEC/FMP fundamentals are wired into scan payloads.
- Future live research data: See `LIVE_DATA_SETUP.md` for Twelve Data, SEC EDGAR, FMP, Alpha Vantage, RSS, SQLite cache TTLs, and API-budget safety.

## Local Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

The dev server runs at:

```text
http://localhost:3000
```

## Project Rules

The full build brief and phase plan live in `config.toml`.

Stable reference tags:

- `v1.0`: Original fully functional local portfolio tracker baseline.
- `v1.1-ui-polish`: UI polish and analyzer-era refinements.
- `v1.1.1-data-fix`: Robinhood `BCXL` correction-row handling.
- `v1.2-market-provider-qa`: Market-data resolver prep plus mobile dividend QA cleanup.
