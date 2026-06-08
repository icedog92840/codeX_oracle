# codeX Oracle Project Memory

This file preserves the current project state for future Codex turns if chat context compacts.

## Current App State

- Project path: `C:\Users\Storm\Desktop\codeX_oracle`
- Local CSV source: `Transaction_Log.csv` in the project root.
- The app dynamically parses the local Robinhood CSV on server-rendered routes.
- Dark fintech theme is based on the uploaded dashboard image.
- Current stable checkpoint: `v1.4-live-data-ready`.
- Important routes:
  - `/` dashboard
  - `/dividends` dividend tracker
  - `/drip` DRIP compounding visualizer
  - `/transactions` paged transaction verifier
  - `/analyzer` research-first stock analyzer with mock OHLC fallback
  - `/data-providers` provider setup and cache/budget status

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
- Market data is isolated behind `src/lib/market-data/market-data-provider.ts`; dashboard prices reuse cached research quotes when available and fall back to latest CSV prices. Dividend yields/PADI still use local trailing dividend math.
- Visual QA found and fixed small-screen table compression by giving the dividend matrix and transaction table themed horizontal scrolling on narrow screens.
- Visual QA found and fixed small-screen DRIP metric clipping by stacking metric label/value rows on mobile.
- Mobile layout now avoids table-style horizontal scanning:
  - Dashboard holdings render stacked holding cards on mobile and the dense table on desktop/tablet.
  - Transaction history renders stacked transaction cards on mobile and the dense table on desktop/tablet.
  - Dividend matrix is desktop-only; mobile renders stacked dividend asset cards.
  - Mobile navigation is a floating bottom bar with short labels.
- Dividend ticker popouts now show the highest historical dividend payout received for that ticker across the full CSV, plus the last three historical dividend payments.
- Stock Analyzer page added after Version 1.0:
  - Research-first analyzer provider using cached `/api/research` OHLC when configured, with deterministic mock OHLC fallback for 200 daily candles.
  - Local SMA, support/resistance, RSI, and MACD calculations.
  - Transparent 0-100 technical scoring, A-F grade, signal chips, score breakdown, and rule-based summary.
  - Graham Defensive, Buffett Quality, and combined Owner Grade scorecards with metric popout explanations.
  - Value score fundamentals use SEC data when configured and deterministic local estimates for missing fields.
  - Browser localStorage recent scans and watchlist, mirrored into SQLite for durability.
  - Watchlist ticker clicks open a saved scan snapshot drawer backed by SQLite.
  - Analyzer added to desktop nav and mobile bottom nav as `Scan`.
- Analyzer data now resolves through `src/lib/analyzer/analyzer-data-resolver.ts` and `analyzer-data-settings.ts`.
- The active analyzer provider is `research`; it prefers cached `/api/research` OHLC data and falls back to deterministic mock candles when provider keys are missing or provider candles are unusable.
- Market data now resolves through `src/lib/market-data/market-data-resolver.ts` and `market-data-settings.ts`.
- The active dashboard market-data provider is `live`, but it is cache-first: it reads provider quotes already stored in SQLite and falls back to local CSV prices without making dashboard-triggered API calls.
- External live-data scaffolding now lives under `src/lib/external-data`:
  - SQLite database in `.data/codex-oracle.db`.
  - Provider cache responses and API-budget counters stored in SQLite.
  - Future-ready tables for analyzer scans, watchlist items, news, CSV imports, and app settings.
  - Provider adapters for Twelve Data, SEC EDGAR, Alpha Vantage, FMP, and configurable RSS news.
  - Server route `/api/research/[ticker]` for cached quote/candles/fundamentals/news without exposing API keys.
  - `/api/research/[ticker]?refresh=1` for budget-guarded provider refreshes.
  - Server routes `/api/analyzer/scans` and `/api/watchlist` for SQLite-backed scan and watchlist persistence.
  - Server route `/api/analyzer/snapshot/[ticker]` for saved scan history plus cached news.
  - Server route `/api/market/refresh-quotes` for portfolio-wide lightweight quote refresh without deep Analyzer scans.
  - `/data-providers` includes an isolated Research Test Harness for checking `/api/research/[ticker]` quote, OHLC, fundamentals, news, source tags, and cache freshness.
  - `.env.example` lists every key-ready provider variable while `.env.local` remains ignored.
  - FMP is the recommended free-first news path; RSS remains a no-cost fallback if FMP news is gated.
  - Setup notes in `LIVE_DATA_SETUP.md`.
- Live provider validation completed:
  - Twelve Data quote and 200-candle OHLC payloads work and cache in SQLite.
  - SEC EDGAR fundamentals work and now use annual-duration facts for income, cash flow, and revenue growth.
  - RSS news works and caches headline payloads in SQLite.
  - Analyzer UI has been manually confirmed to show provider OHLC instead of mock fallback.
  - Dashboard AAPL holding was manually confirmed to use cached Twelve Data quote pricing after a research scan.
  - Portfolio Quote Refresh panel was added to `/data-providers`; it tries FMP batch quotes when available and falls back to Twelve Data with budget guards.
- Mobile dividend payout chart tooltip overflow was fixed by making first/last bar popovers align inward.

## Stable Reference Tags

- `v1.0`: Original fully functional local portfolio tracker baseline.
- `v1.1-ui-polish`: UI polish and analyzer-era refinements.
- `v1.1.1-data-fix`: Robinhood `BCXL` correction-row handling.
- `v1.2-market-provider-qa`: Market-data resolver prep plus mobile dividend QA cleanup.
- `v1.3-analyzer-persistence-value-score`: SQLite analyzer persistence, provider status, research refresh, and Graham/Buffett SEC fallback wiring.
- `v1.4-live-data-ready`: Live research provider validation with Twelve Data OHLC, SEC annual fundamentals, RSS news, SQLite caching, and corrected SEC annual fact parsing.

## Current Next Steps

1. Improve Graham/Buffett scoring with more real multi-year SEC fundamentals after provider coverage is proven.
2. Consider wiring dashboard market prices/yields to the same cached provider layer while keeping CSV calculations local-first.
3. Keep FMP stock news optional; RSS is the current working free news path.
4. Run targeted app QA after any scoring or dashboard live-data changes.

## Verification Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Latest Visual QA

- Desktop and mobile screenshots were captured under `C:\Users\Storm\Documents\Codex\2026-06-05\i-want-you-to-create-a\qa-screenshots`.
- Browser smoke scan covered `/`, `/dividends`, `/dividends?trend=annual`, `/drip`, and `/transactions`.
- Smoke scan found no app error text, no `NaN`, no `Infinity`, and no desktop horizontal overflow.
- Later screenshot capture began timing out in the in-app browser, so prefer DOM route scans, overflow checks, typecheck, lint, and build unless a screenshot is specifically needed.
