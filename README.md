# codeX Oracle

Compact local financial portfolio dashboard built with Next.js, React, Tailwind CSS, and shadcn/ui patterns.

## Current Status

The app is past the original Version 1.0 baseline and is currently tagged at `v1.4-live-data-ready`.

- Next.js App Router, React, Tailwind CSS, and shadcn-compatible UI primitives.
- Dark mobile-friendly fintech theme based on the uploaded dashboard reference image.
- CSV-backed dashboard, dividends, DRIP visualizer, transactions, and stock analyzer routes.
- Local Robinhood CSV parsing from `Transaction_Log.csv` in the project root.
- Portfolio holdings, weighting, unrealized P/L, dividends paid, and PADI calculations.
- Dividend matrix, dividend cards, payout charts, DRIP metrics, and historical payout popouts.
- Paged/filterable transaction verification with mobile stacked cards.
- Research-first stock analyzer with provider OHLC fallback handling, technical indicators, Graham/Buffett owner scoring, SQLite-backed watchlist mirroring, and saved scan snapshot drawer.
- Isolated market-data provider resolver with cached research quotes for dashboard prices and local dividend-yield fallback.
- Isolated analyzer-data provider resolver for future live historical OHLC APIs.
- Server-only external-data providers with SQLite cache, free-tier budgets, and `/api/research/[ticker]`.

## Data Sources

- `Transaction_Log.csv`: Parsed dynamically on server-rendered routes for holdings, dividends, DRIP, transactions, and dashboard calculations.
- Market prices/yields: Dashboard prices reuse cached research quotes when available and fall back to latest CSV prices. Dividend yields/PADI still use local trailing dividend math until a forward yield provider is connected.
- Analyzer OHLC candles: Twelve Data cached provider candles when configured, with Alpha Vantage and deterministic local mock fallbacks. The provider interface lives in `src/lib/analyzer`. No external indicator API is used.
- Analyzer value metrics: SEC annual fundamentals when configured, with deterministic local estimates as fallback.
- Analyzer news: RSS news fallback is cached in SQLite; FMP stock news remains optional if the account plan supports it.
- Live research setup: See `LIVE_DATA_SETUP.md` for Twelve Data, SEC EDGAR, FMP, Alpha Vantage, RSS, SQLite cache TTLs, API-budget safety, and the `/data-providers` research test harness.

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
- `v1.3-analyzer-persistence-value-score`: SQLite analyzer persistence, provider status, research refresh, and Graham/Buffett SEC fallback wiring.
- `v1.4-live-data-ready`: Live research provider validation with Twelve Data OHLC, SEC annual fundamentals, RSS news, SQLite caching, and corrected SEC annual fact parsing.
