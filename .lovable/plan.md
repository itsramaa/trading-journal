
# Plan: Dokumentasi Lengkap Trading Journey Web Application

## Overview

Berdasarkan eksplorasi mendalam terhadap codebase (35+ files), saya akan membuat dokumentasi lengkap yang mencakup semua aspek aplikasi Trading Journey - sebuah web-based trading journal untuk crypto futures dengan integrasi Binance dan AI.

---

## Struktur Dokumentasi

Dokumentasi akan dibuat dalam folder `docs/` dengan struktur file berikut:

```
docs/
├── README.md                    # Project overview & quick start
├── ARCHITECTURE.md              # System architecture (update)
├── DATABASE.md                  # Database schema (update)
├── DOMAIN_MODEL.md              # Trading domain concepts (update)
├── DEVELOPMENT.md               # Development guidelines (update)
├── FEATURES.md                  # Feature breakdown (NEW)
├── FRONTEND.md                  # Frontend documentation (NEW)
├── BACKEND.md                   # Edge functions & API (NEW)
├── STATE_MANAGEMENT.md          # State & data flow (NEW)
└── BINANCE_INTEGRATION.md       # Binance API integration (NEW)
```

---

## Detail Per File

### 1. `docs/README.md` (Update)

**Konten:**
- Deskripsi singkat aplikasi Trading Journey
- Target user: Crypto futures traders
- Fitur utama (high-level)
- Tech stack summary
- Quick start guide
- Link ke dokumentasi lain

### 2. `docs/ARCHITECTURE.md` (Update)

**Konten:**
- High-level system diagram (text-based)
- Application structure (folder breakdown)
- Provider stack hierarchy:
  ```
  QueryClientProvider
    └─ ThemeProvider
       └─ TooltipProvider
          └─ MarketContextProvider
             └─ Routes + Components
  ```
- Data flow diagram: User → Hook → Edge Function → Binance/DB → Response
- Navigation structure dengan route mapping

### 3. `docs/DATABASE.md` (Update)

**Konten:**
- Core tables dengan field descriptions:
  - `accounts` (trading/backtest types)
  - `trade_entries` (40+ fields including Binance sync fields)
  - `trading_strategies` (entry/exit rules, sharing)
  - `risk_profiles` (6 risk parameters)
  - `daily_risk_snapshots`
  - `risk_events`
  - `user_settings`
  - `account_transactions`
  - `account_balance_snapshots`
  - `trading_pairs`
  - `backtest_results`
- Relationship diagram (text-based)
- RLS policies explanation
- Database functions (generate_share_token, update_account_balance, dll)
- Enum types (account_type, subscription_tier, dll)

### 4. `docs/DOMAIN_MODEL.md` (Update)

**Konten:**
- Binance Futures trading lifecycle:
  1. Open Position (order → position)
  2. Hold Position (mark price, funding fee)
  3. Close Position (realized P&L, commission)
  4. Post-Trade (journal enrichment)
- Income types mapping:
  | Type | Domain Entity | Is Trade? |
  |------|---------------|-----------|
  | REALIZED_PNL | Trade P&L | YES |
  | COMMISSION | Fee | NO |
  | FUNDING_FEE | Cost | NO |
  | TRANSFER | Capital | NO |
- P&L hierarchy (Account → Position → Trade → Period)
- Net P&L formula: `Gross - Commission - Funding + Rebates`
- Risk parameters dengan defaults
- Market context model (sentiment, fear/greed, volatility, events, momentum)

### 5. `docs/DEVELOPMENT.md` (Update)

**Konten:**
- Component structure pattern (imports → types → hooks → handlers → render)
- Hook patterns:
  - Query hook pattern
  - Mutation hook pattern dengan toast feedback
- File naming conventions:
  - Components: PascalCase.tsx
  - Hooks: use-kebab-case.ts
  - Types: kebab-case.ts
- Styling guidelines (design tokens only)
- Testing structure (contracts, integration, e2e, state, observability)
- Edge function development pattern

### 6. `docs/FEATURES.md` (NEW)

**Konten per fitur:**

#### Dashboard
- Purpose: Overview trading performance
- Components: 7-Day Stats, SmartQuickActions, MarketScoreWidget, SystemStatus, MarketSessions, ActivePositions, RiskSummaryCard, AIInsightsWidget
- Data sources: useTradeEntries, useBinancePositions, useBinanceConnectionStatus

#### Trading Journal
- Purpose: Trade management hub
- Tabs: Pending, Active
- Flow: New Trade → Wizard 5-step → Post-trade analysis
- Components: AllPositionsTable, TradeSummaryStats, TradeEnrichmentDrawer
- Features: Screenshot upload, strategy linking, market context capture

#### Trade Entry Wizard
- 5 steps: Setup → Confluence → Position Sizing → Checklist → Confirmation
- Express Mode (3 steps)
- Trading Gate integration (blocks if daily loss exceeded)
- AI Quality Score check

#### Strategy Management
- Features: Create/Edit/Delete strategies
- Entry Rules Builder (6 rule types)
- Exit Rules Builder
- YouTube Strategy Importer
- Strategy Sharing (share token)
- Backtesting dengan real Klines

#### Risk Management
- Daily Loss Tracker (Binance-centered)
- Risk Profile Settings (6 parameters)
- Risk Event Audit Log
- Correlation Matrix
- Context-Aware Risk Adjustment

#### Position Calculator
- Position sizing dengan context warnings
- Volatility-based stop loss
- Market regime awareness
- Risk adjustment breakdown

#### Analytics
- Performance Overview (Win rate, profit factor, expectancy, drawdown)
- Daily P&L breakdown
- Trading Heatmap (hour/day performance)
- AI Insights
- Contextual analytics (Fear/Greed, Event Days, Volatility)

#### Market Data
- Market Insight dengan sentiment
- Economic Calendar
- Top Movers
- AI Analysis

### 7. `docs/FRONTEND.md` (NEW)

**Konten:**

#### Pages Structure
```
src/pages/
├── Dashboard.tsx              # Main overview
├── trading-journey/
│   ├── TradingJournal.tsx    # Trade management
│   └── StrategyManagement.tsx
├── TradeHistory.tsx           # Standalone history
├── Performance.tsx            # Analytics
├── DailyPnL.tsx              # P&L breakdown
├── RiskManagement.tsx         # Risk settings
├── PositionCalculator.tsx     # Position sizing
└── ...
```

#### Component Organization
```
src/components/
├── ui/              # shadcn primitives (50+ components)
├── dashboard/       # Dashboard widgets (10 components)
├── journal/         # Trade journal components
├── risk/            # Risk management
├── strategy/        # Strategy components
├── analytics/       # Charts & visualizations
├── trade/           # Trade entry wizard
├── layout/          # Sidebar, Header
└── ...
```

#### Custom Hooks
Grouped by domain:
- Binance: use-binance-*, useBinance*
- Trade: use-trade-entries, use-trading-strategies
- Risk: use-risk-profile, use-context-aware-risk
- Analytics: use-daily-pnl, use-unified-market-score
- Auth: use-auth

#### State Management
- Zustand (app-store.ts): Currency, notifications, search, chatbot
- React Query: Server state dengan queryKey patterns
- Context: MarketContext untuk symbol selection

#### UI Patterns
- Card-based layouts
- Tabs untuk multi-view pages
- Dialog/Drawer untuk forms
- Empty states dengan onboarding
- Loading skeletons
- Keyboard shortcuts (⌘K)

### 8. `docs/BACKEND.md` (NEW)

**Konten:**

#### Edge Functions List
```
supabase/functions/
├── binance-futures/        # Binance API proxy
├── binance-market-data/    # Public market data
├── ai-preflight/           # Pre-trade AI check
├── trade-quality/          # Trade quality scoring
├── dashboard-insights/     # AI dashboard insights
├── post-trade-analysis/    # Post-trade AI analysis
├── confluence-detection/   # Confluence validation
├── macro-analysis/         # Macro analysis
├── market-insight/         # Market sentiment
├── economic-calendar/      # Economic events
├── youtube-strategy-import/# YouTube importer
├── backtest-strategy/      # Backtesting
├── check-permission/       # Permission check
├── sync-trading-pairs/     # Trading pairs sync
└── strategy-clone-notify/  # Strategy clone notification
```

#### Edge Function Patterns
- CORS headers
- Auth token handling
- Error response format
- Binance HMAC signature generation

#### External APIs
- Binance Futures API (authenticated + public)
- Fear & Greed Index (Alternative.me)
- Economic Calendar API
- Lovable AI (Gemini 2.5 Flash)

### 9. `docs/STATE_MANAGEMENT.md` (NEW)

**Konten:**

#### Zustand Store
```typescript
// app-store.ts
- currencyPair
- notifications
- searchQuery
- chatbot state
```

#### React Query Patterns
```typescript
// Query Key conventions
['binance', 'balance']
['binance', 'positions', symbol]
['trade-entries', userId]
['trading-strategies', userId]
['risk-profile', userId]
```

#### Realtime Subscriptions
- Tables: accounts, account_transactions, trade_entries, trading_strategies
- Pattern: useRealtime hook dengan query invalidation

#### Context Providers
- MarketContextProvider: Global symbol selection
- ThemeProvider: Dark/light mode
- QueryClientProvider: React Query setup

### 10. `docs/BINANCE_INTEGRATION.md` (NEW)

**Konten:**

#### Integration Overview
- Binance Futures API sebagai Source of Truth
- Edge function proxy (binance-futures)
- HMAC SHA256 signature

#### Supported Actions
```
validate, balance, positions, trades, open-orders
income, commission-rate, leverage-brackets, force-orders
position-mode, all-orders, symbol-config, adl-quantile
transaction-history, request-download, get-download
```

#### Data Types
- BinanceAccountSummary
- BinancePosition
- BinanceTrade
- BinanceOrder
- BinanceIncome

#### Income Type Categories
```
pnl: REALIZED_PNL
fees: COMMISSION
funding: FUNDING_FEE
transfers: TRANSFER, INTERNAL_TRANSFER
rewards: WELCOME_BONUS, REFERRAL_KICKBACK, etc.
```

#### Hooks
- useBinanceConnectionStatus
- useBinanceBalance
- useBinancePositions
- useBinanceIncomeHistory
- useBinanceAllIncome
- useBinanceDailyPnl
- useBinanceWeeklyPnl

#### Auto-Sync
- Hook: useBinanceAutoSync
- Filter: REALIZED_PNL only
- Mapping ke trade_entries

---

## Technical Notes & TODOs

Selama eksplorasi, ditemukan beberapa hal yang perlu dicatat:

1. **TODO**: DailyPnL symbol breakdown menggunakan mock data (perlu fix)
2. **TODO**: R:R calculation returns 0 untuk Binance trades tanpa entry/SL data
3. **TODO**: Dashboard belum memiliki Portfolio Overview card (planned in plan.md)
4. **TODO**: AI Insights widget belum ada Correlation Warning dan Market Regime badge

---

## Implementation Approach

1. **Update existing files** (README, ARCHITECTURE, DATABASE, DOMAIN_MODEL, DEVELOPMENT) dengan informasi terbaru
2. **Create new files** (FEATURES, FRONTEND, BACKEND, STATE_MANAGEMENT, BINANCE_INTEGRATION)
3. **Cross-reference** antar dokumen dengan links
4. **Include code snippets** untuk patterns penting
5. **Add diagrams** dalam format text/ASCII

---

## Estimated Files

| File | Lines (est.) | Status |
|------|--------------|--------|
| README.md | ~100 | Update |
| ARCHITECTURE.md | ~200 | Update |
| DATABASE.md | ~300 | Update |
| DOMAIN_MODEL.md | ~200 | Update |
| DEVELOPMENT.md | ~250 | Update |
| FEATURES.md | ~500 | New |
| FRONTEND.md | ~400 | New |
| BACKEND.md | ~300 | New |
| STATE_MANAGEMENT.md | ~200 | New |
| BINANCE_INTEGRATION.md | ~350 | New |

Total: ~2,800 lines of documentation
