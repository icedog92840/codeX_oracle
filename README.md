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
- Local mock-OHLC stock analyzer with technical indicators, scoring, recent scans, and watchlist.
- Isolated market-data provider resolver for future live stock price and dividend yield APIs.

## Data Sources

- `Transaction_Log.csv`: Parsed dynamically on server-rendered routes for holdings, dividends, DRIP, transactions, and dashboard calculations.
- Market prices/yields: Local placeholders only. The provider interface lives in `src/lib/market-data`.
- Analyzer OHLC candles: Deterministic local mock data only. No external indicator API is used.

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
