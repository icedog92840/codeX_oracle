# codeX Oracle Project Memory

This file preserves the current project state for future Codex turns if chat context compacts.

## Current App State

- Project path: `C:\Users\Storm\Desktop\codeX_oracle`
- Local CSV source: `Transaction_Log.csv` in the project root.
- The app dynamically parses the local Robinhood CSV on server-rendered routes.
- Dark fintech theme is based on the uploaded dashboard image.
- Important routes:
  - `/` dashboard
  - `/dividends` dividend tracker
  - `/drip` DRIP compounding visualizer
  - `/transactions` paged transaction verifier

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
- Current state is ready to discuss as a Version 1.0 candidate after user review.

## Current Next Steps

1. User review of the Version 1.0 candidate screenshots and live app.
2. If approved, explicitly designate this baseline as Version 1.0 and commit/tag it.
3. Future work can plug a live provider into `MarketDataProvider` without changing dashboard UI components.

## Verification Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Latest Visual QA

- Desktop and mobile screenshots were captured under `C:\Users\Storm\Documents\Codex\2026-06-05\i-want-you-to-create-a\qa-screenshots`.
- Browser smoke scan covered `/`, `/dividends`, `/dividends?trend=annual`, `/drip`, and `/transactions`.
- Smoke scan found no app error text, no `NaN`, no `Infinity`, and no desktop horizontal overflow.
