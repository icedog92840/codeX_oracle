# codeX Oracle Project Memory

This file preserves the current project state for future Codex turns if chat context compacts.

## Current App State

- Project path: `C:\Users\Storm\Desktop\codeX_oracle`
- Local CSV source: `Transaction_Log.csv` in the project root.
- The app dynamically parses the local Robinhood CSV on server-rendered routes.
- Dark fintech theme is based on the uploaded dashboard image.
- Current pushed checkpoint: `v1.2-market-provider-qa`.
- Important routes:
  - `/` dashboard
  - `/dividends` dividend tracker
  - `/drip` DRIP compounding visualizer
  - `/transactions` paged transaction verifier
  - `/analyzer` local mock-OHLC stock analyzer

## Completed Highlights

- Fixed Robinhood parser handling for `S` suffix share quantities and corporate-action share movements.
- Dashboard cards show Portfolio Value, Total P/L, Dividends Paid, and PADI.
- Holdings table supports column sorting.
- Transactions table is server-paged and URL-filtered.
- Native transaction dropdowns were replaced with themed custom dropdowns.
- Dividend page is CSV-backed with:
  - `ALL` year range plus individual years.
  - Sortable monthly matrix with totals footer.
  - Ticker popouts showing Starting Date, DRIP Shares, Average Cost, Adjusted Average, YOC, and placeholder info.
  - Popout metric explanations with formulas.
  - Monthly/annual payout trend switch.
  - Themed pill scrollbar and bottom glow on scrollable calendar.
- Initial `/drip` implementation now reads the CSV and compares DRIP-active vs no-DRIP compounding.
- `/drip` browser verification confirmed two SVG curves, point markers, year-span slider, metrics, and ticker options render.
- `/drip` was polished with projection assumptions, terminal DRIP/no-DRIP values, terminal gap, one projected boundary marker, and a default view that includes projected years.
- Market data is isolated behind `src/lib/market-data/market-data-provider.ts`; the current provider is local-only and keeps TODO placeholders for future live stock prices and dividend yields.
- Visual QA found and fixed small-screen table compression by giving the dividend matrix and transaction table themed horizontal scrolling on narrow screens.
- Visual QA found and fixed small-screen DRIP metric clipping by stacking metric label/value rows on mobile.
- Mobile layout now avoids table-style horizontal scanning:
  - Dashboard holdings render stacked holding cards on mobile and the dense table on desktop/tablet.
  - Transaction history renders stacked transaction cards on mobile and the dense table on desktop/tablet.
  - Dividend matrix is desktop-only; mobile renders stacked dividend asset cards.
  - Mobile navigation is a floating bottom bar with short labels.
- Dividend ticker popouts now show the highest historical dividend payout received for that ticker across the full CSV, plus the last three historical dividend payments.
- Stock Analyzer page added after Version 1.0:
  - Deterministic mock OHLC provider for 200 daily candles.
  - Local SMA, support/resistance, RSI, and MACD calculations.
  - Transparent 0-100 technical scoring, A-F grade, signal chips, score breakdown, and rule-based summary.
  - Browser localStorage recent scans and watchlist.
  - Analyzer added to desktop nav and mobile bottom nav as `Scan`.
- Analyzer data now resolves through `src/lib/analyzer/analyzer-data-resolver.ts` and `analyzer-data-settings.ts`.
- The active analyzer provider remains `mock`; selecting `live` intentionally errors until a real historical OHLC provider is connected.
- Market data now resolves through `src/lib/market-data/market-data-resolver.ts` and `market-data-settings.ts`.
- The active provider remains `local-placeholder`; selecting `live` intentionally errors until a real provider is connected.
- External live-data scaffolding now lives under `src/lib/external-data`:
  - SQLite database in `.data/codex-oracle.db`.
  - Provider cache responses and API-budget counters stored in SQLite.
  - Future-ready tables for analyzer scans, watchlist items, news, CSV imports, and app settings.
  - Provider adapters for Twelve Data, SEC EDGAR, Alpha Vantage, FMP, and configurable RSS news.
  - Server route `/api/research/[ticker]` for cached quote/candles/fundamentals/news without exposing API keys.
  - Setup notes in `LIVE_DATA_SETUP.md`.
- Mobile dividend payout chart tooltip overflow was fixed by making first/last bar popovers align inward.

## Stable Reference Tags

- `v1.0`: Original fully functional local portfolio tracker baseline.
- `v1.1-ui-polish`: UI polish and analyzer-era refinements.
- `v1.1.1-data-fix`: Robinhood `BCXL` correction-row handling.
- `v1.2-market-provider-qa`: Market-data resolver prep plus mobile dividend QA cleanup.

## Current Next Steps

1. Keep the app local-first while preparing clean extension points for future live data.
2. Add a dedicated settings/data page for provider choices, cache status, and assumptions if the top-ribbon Data popout becomes too compact.
3. Wire analyzer UI to `/api/research/[ticker]` only after API keys/env are configured and the fallback behavior is reviewed.
4. Watchlist/recent scans can later move from browser localStorage to file/SQLite storage if persistence needs to survive browser clearing.

## Verification Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Latest Visual QA

- Desktop and mobile screenshots were captured under `C:\Users\Storm\Documents\Codex\2026-06-05\i-want-you-to-create-a\qa-screenshots`.
- Browser smoke scan covered `/`, `/dividends`, `/dividends?trend=annual`, `/drip`, and `/transactions`.
- Smoke scan found no app error text, no `NaN`, no `Infinity`, and no desktop horizontal overflow.
- Later screenshot capture began timing out in the in-app browser, so prefer DOM route scans, overflow checks, typecheck, lint, and build unless a screenshot is specifically needed.
