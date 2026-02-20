# Portfolio Tracker — Project Knowledge

## Overview
Desktop app to track your complete financial portfolio — real estate, stocks, crypto, retirement accounts, and debts/liabilities. Includes a Smart Insights engine that analyzes the full portfolio and generates actionable financial recommendations.

## Tech Stack
- **Framework:** Electron 40.6.0 + Electron Forge + Vite (desktop) / Vite + Vercel (web)
- **Frontend:** React 19, TypeScript, Tailwind CSS, Recharts
- **Backend (desktop):** Node.js (main process), better-sqlite3 (SQLite w/ WAL mode)
- **Backend (web):** IndexedDB (browser storage), Vercel serverless functions
- **APIs:** Yahoo Finance (stocks via `yahoo-finance2`), CoinGecko (crypto)
- **Routing:** react-router-dom v7 (HashRouter for Electron, BrowserRouter for web)
- **State:** React Context + useReducer (PortfolioContext)
- **PWA:** Service worker, manifest.json, installable on iOS/Android

## Architecture
```
src/
├── main/                        # Electron main process (UNTOUCHED by web changes)
│   ├── main.ts                  # App entry: init DB, migrations, IPC, window, scheduler
│   ├── preload.ts               # contextBridge exposing window.api
│   ├── database/
│   │   ├── connection.ts        # SQLite init/close with WAL mode
│   │   ├── migrations.ts        # CREATE TABLE IF NOT EXISTS for all tables
│   │   └── repositories/        # CRUD per entity (stockRepo, cryptoRepo, debtRepo, etc.)
│   ├── ipc/
│   │   └── handlers.ts          # All ipcMain.handle() registrations + computeSummary()
│   └── services/
│       ├── priceScheduler.ts    # 5-min background price refresh + daily snapshot
│       ├── stockService.ts      # Yahoo Finance API
│       ├── cryptoService.ts     # CoinGecko API
│       ├── csvImporter.ts       # CSV/PDF import (Robinhood, CoinMarketCap)
│       └── insightsEngine.ts    # Smart financial insights + debt payoff simulator
├── renderer/                    # Shared React frontend (used by both Electron + Web)
│   ├── App.tsx                  # HashRouter with all routes (Electron entry)
│   ├── context/
│   │   └── PortfolioContext.tsx  # Global state: all entities + CRUD methods
│   ├── types/
│   │   ├── models.ts            # TypeScript interfaces for all entities
│   │   └── ipc.ts               # ElectronAPI interface (window.api)
│   ├── pages/                   # One page per entity + Dashboard + Insights + Settings
│   ├── components/
│   │   ├── layout/              # Sidebar (mobile drawer), Header, MainLayout
│   │   ├── dashboard/           # NetWorthCard, CashFlowCard, AllocationPieChart, PerformanceLineChart, AssetCategorySummary, AiAdvisorPanel
│   │   ├── forms/               # StockForm, CryptoForm, RealEstateForm, RetirementForm, DebtForm, CashFlowForm
│   │   └── shared/              # Button, Card, Modal, Input, EmptyState, CurrencyDisplay
│   └── lib/
│       ├── formatters.ts        # formatCurrency, formatPercent, formatNumber, formatDate
│       └── colors.ts            # CATEGORY_COLORS, CHART_COLORS
├── web/                         # Web platform layer (PWA)
│   ├── index.html               # PWA-ready HTML shell
│   ├── entry.tsx                # Web entry: init IndexedDB, mount React, start scheduler
│   ├── data/
│   │   ├── db.ts                # IndexedDB schema + connection (6 object stores)
│   │   └── webApi.ts            # Implements ElectronAPI interface using IndexedDB
│   ├── services/
│   │   ├── insightsEngine.ts    # Client-side insights (pure computation, no repo deps)
│   │   ├── csvParser.ts         # Browser-compatible CSV parsing
│   │   └── priceRefresh.ts      # Fetch prices from CoinGecko + /api/stock-prices
│   └── api/
│       └── stock-prices.ts      # Vercel serverless function (yahoo-finance2 proxy)
public/                          # Static assets (served by Vite, copied to dist-web)
├── icons/                       # PWA icons (SVG)
├── manifest.json                # PWA manifest
└── sw.js                        # Service worker (cache-first shell, network-first API)
vite.web.config.ts               # Separate Vite config for web build
vercel.json                      # Vercel deployment config
```

## Database Tables (SQLite)
- `real_estate` — properties with estimated value, mortgage balance, monthly payments
- `stocks` — ticker, shares, cost basis, current price (auto-updated)
- `crypto` — coin_id, quantity, cost basis, current price (auto-updated)
- `retirement` — account type (401k/IRA/etc), institution, balance, contributions
- `debts` — debt type, lender, balances (original/current), interest rate, payments, due day
- `cash_flow` — flow_type (income/expense), category, amount, frequency (weekly/biweekly/monthly/yearly), is_active
- `ai_analyses` — AI advisor analysis history (model, portfolio snapshot, response text)
- `portfolio_snapshots` — daily snapshots of all category values + net worth

## Key Patterns
- **Adding a new entity type:** Follow the stocks pattern through the full stack:
  1. `repositories/{entity}Repo.ts` — Row interface, toApi(), CRUD functions
  2. `migrations.ts` — ADD CREATE TABLE
  3. `handlers.ts` — ipcMain.handle() for CRUD + update computeSummary()
  4. `preload.ts` — expose via contextBridge
  5. `types/models.ts` — interface + Create/Update input types
  6. `types/ipc.ts` — add to ElectronAPI
  7. `context/PortfolioContext.tsx` — state, action, reducer, callbacks, refreshAll
  8. `components/forms/{Entity}Form.tsx` — modal form
  9. `pages/{Entity}Page.tsx` — table + empty state + form modal
  10. `App.tsx` — add Route
  11. `Sidebar.tsx` — add navItem
  12. `priceScheduler.ts` — include in computePortfolioValues() if relevant

- **IPC naming:** `entity:action` (e.g., `debts:get-all`, `debts:create`)
- **IDs:** UUID v4 via `uuid` package
- **Timestamps:** ISO 8601 strings
- **DB columns:** snake_case; API/TS fields: camelCase (toApi() maps between them)

## Smart Insights Engine
Located at `src/main/services/insightsEngine.ts`. Generates:
- **Debt payoff strategies:** Avalanche (highest rate first) vs Snowball (smallest balance first) with estimated months to payoff
- **Leverage analysis:** Compares investment returns vs debt interest rates
- **Portfolio health:** Debt-to-asset ratio, diversification warnings, emergency fund check
- **Cash flow insights:** Minimum-only payment warnings, annual interest cost
- **Net worth calculation:** Assets (real estate equity + stocks + crypto + retirement) minus debts

## Running
```bash
# Desktop (Electron)
npm start          # Dev mode with hot reload
npm run package    # Build distributable

# Web (PWA)
npm run dev:web    # Dev server at http://localhost:5174
npm run build:web  # Production build to dist-web/
vercel deploy      # Deploy to Vercel (from project root)
```

## Known Pre-existing TS Issues (not from our changes)
- `stockService.ts` — yahoo-finance2 typing issue with `regularMarketPrice`
- `AllocationPieChart.tsx` / `PerformanceLineChart.tsx` — recharts Formatter type mismatch
- `RealEstateForm.tsx` / `RetirementForm.tsx` — select onChange string→union type cast

## CSV/PDF Import
Located at `src/main/services/csvImporter.ts`. Supports:
- **Robinhood CSV:** Parses activity report (Buy/Sell transactions), aggregates into holdings
- **Robinhood PDF:** Extracts text via `pdf-parse` v2 (child_process to avoid Vite bundling), parses stock holdings from monthly statements
- **CoinMarketCap CSV:** Flexible column detection, handles both holdings-style and transaction-log CSVs
- **CoinGecko ID Resolution:** KNOWN_COIN_IDS map (50+ coins) + fallback to CoinGecko search API

### Vite + Native Modules Pattern
Native Node.js modules (better-sqlite3, pdf-parse) cannot be bundled by Vite. Solutions:
- `vite.main.config.ts` — externals: `['better-sqlite3', 'pdf-parse', 'dotenv']`
- PDF parsing runs in a separate Node process via `child_process.execFileSync` to avoid Vite entirely
- The temp script directly requires `pdf-parse/dist/pdf-parse/cjs/index.cjs` by absolute path

## Web / PWA Architecture
The web version shares the same React renderer code as Electron, with a different data layer:
- **IndexedDB** replaces SQLite (6 object stores matching the SQLite tables)
- **`webApi.ts`** implements the same `ElectronAPI` interface so `PortfolioContext` works unchanged
- **Vercel serverless function** (`/api/stock-prices`) proxies Yahoo Finance (no CORS)
- **CoinGecko** called directly from browser (CORS-compatible)
- **Service worker** enables offline caching and "Add to Home Screen" on iOS
- **Mobile-responsive** — sidebar becomes drawer on mobile, tables scroll horizontally, grids stack
- **CSV import** uses HTML `<input type="file">` on web (vs Electron dialog)
- **PDF import** not available on web (requires Node.js)

### Platform Detection
```typescript
const isWeb = typeof navigator !== 'undefined' && !navigator.userAgent.includes('Electron');
```
Used in: StocksPage, CryptoPage (import flow), SettingsPage (storage info)

## AI Portfolio Advisor
Located at `src/main/services/aiAdvisor.ts`. Uses Anthropic API (claude-sonnet-4-20250514):
- Gathers full portfolio data (all entities) and sends to Claude for analysis
- System prompt covers: asset allocation, debt strategy, investment recommendations, risk warnings, action items
- Results stored in `ai_analyses` table with full portfolio snapshot for history
- API key loaded from `.env` file via `dotenv` (add `ANTHROPIC_API_KEY=sk-ant-...` to `.env`)
- UI: `AiAdvisorPanel` button on dashboard → full-screen modal with markdown rendering + history

## Cash Flow Tracking
Income and expense tracking to calculate deployable free cash per month:
- **Entity:** `CashFlowItem` with flow_type (income/expense), category, amount, frequency, isActive
- **Frequency normalization:** Weekly × 52/12, Biweekly × 26/12, Monthly × 1, Yearly ÷ 12
- **Categories:** Income (salary, freelance, rental, dividends, side hustle) / Expenses (housing, utilities, insurance, groceries, transportation, subscriptions, dining, entertainment, healthcare, personal, education, debt payments, savings)
- **Dashboard card:** Shows monthly income, expenses, free cash, and savings rate with progress bar
- **Dedicated page:** `/cash-flow` with income/expenses tables, summary cards, paused items section

## Status
- All core features working: real estate, stocks, crypto, retirement, debts, cash flow, dashboard, insights
- CSV import: Robinhood (stocks) and CoinMarketCap (crypto) — working
- PDF import: Robinhood monthly statements — working (pdf-parse v2 via child_process, desktop only)
- Price auto-refresh every 5 minutes (stocks via Yahoo Finance, crypto via CoinGecko)
- Daily portfolio snapshots for net worth tracking over time
- Cash flow tracking: income/expenses with frequency normalization, free cash calculation, savings rate
- AI Portfolio Advisor: Anthropic API-powered analysis with markdown rendering and history
- Smart Insights page with debt payoff simulator and financial recommendations
- Mobile-responsive UI with sidebar drawer, responsive grids, scrollable tables
- PWA with service worker, manifest, installable on iOS/Android home screen
- Web build deploys to Vercel with serverless stock price proxy
- Launch desktop via `Start Portfolio Tracker.bat` or `npm start`
- Launch web via `npm run dev:web` or deploy with `vercel deploy`
