# codeX Oracle

Compact local financial portfolio dashboard built with Next.js, React, Tailwind CSS, and shadcn/ui patterns.

## Current Status

Phase 2 is complete:

- Next.js App Router scaffold
- Tailwind CSS design tokens
- shadcn-compatible `cn()` utility and button component
- Compact fintech app shell
- Dashboard, Dividends, DRIP, and Transactions routes
- Modular folders for cards, charts, tables, layout, hooks, calculations, parsing, types, and mock data
- Local Robinhood CSV parsing from `Transaction_Log.csv`
- Normalized transaction model
- Portfolio holding, weighting, P/L, cash, and PADI calculations
- Isolated static market-data placeholders for future live stock price and dividend yield APIs

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

Version 1.0 has not been designated yet. That happens only after the initial fully functional baseline is complete.
