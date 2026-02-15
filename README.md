# Deriverse Trading Analytics — Comprehensive Trading Journal & Portfolio Analysis

A production-grade **crypto derivatives trading analytics platform** featuring a professional trading journal, portfolio analysis, AI-powered insights, and institutional-level risk management for active traders.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-latest-646CFF)
![Tests](https://img.shields.io/badge/Tests-549%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

🔗 **Live Demo:** [demo-trade.lovable.app](https://demo-trade.lovable.app)

---

## Table of Contents

- [Overview](#overview)
- [Feature Matrix](#feature-matrix)
- [Calculation Formulas & Accuracy](#calculation-formulas--accuracy)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Security](#security)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Documentation](#documentation)

---

## Overview

Deriverse Trading Analytics solves the core problem active crypto traders face: **scattered data, inconsistent analysis, and emotional decision-making**. The platform provides:

- 📊 **Real-time portfolio tracking** with direct Binance Futures API integration
- 📝 **Professional trading journal** with structured entry/exit analysis
- 🧠 **AI-powered post-trade review** and pattern recognition
- 🛡️ **Automated risk management** with daily loss limits and circuit breakers
- 📈 **Institutional-grade metrics** (Sharpe, Sortino, VaR, Kelly Criterion)
- 🔄 **Paper trading mode** with complete data isolation from live performance

---

## Feature Matrix

### ✅ Core Analytics (13/13 Hackathon Requirements)

| # | Feature | Status | Implementation |
|---|---------|--------|----------------|
| 1 | **Total PnL Tracking** | ✅ | Server-side RPC (`get_trade_stats`) + client-side equity curve. Visual indicators with semantic profit/loss colors. |
| 2 | **Trading Volume & Fee Analysis** | ✅ | Fee decomposition: `commission + funding_fees + fees`. Cumulative fee tracking across all trades. |
| 3 | **Win Rate & Trade Count** | ✅ | `wins / totalTrades × 100`. Computed server-side for accuracy. |
| 4 | **Average Trade Duration** | ✅ | `hold_time_minutes` tracked per trade. Mean, median, min, max displayed in Behavioral Analytics. |
| 5 | **Long/Short Ratio** | ✅ | Direction distribution with win rate and PnL correlation per direction. |
| 6 | **Largest Gain/Loss** | ✅ | Extreme Outcomes cards on Performance page with TrendingUp/Down indicators. |
| 7 | **Average Win/Loss Amount** | ✅ | `grossProfit / wins` and `grossLoss / losses`. |
| 8 | **Symbol Filter + Date Range** | ✅ | Multi-filter: symbol, direction, session, strategy, date range, result. |
| 9 | **Historical PnL Charts + Drawdown** | ✅ | Equity curve with peak tracking, drawdown overlay, AI annotations (streak zones, ATH, recovery points). |
| 10 | **Time-Based Performance** | ✅ | Daily heatmap calendar, session analysis (Asia/London/NY/Sydney), hourly performance breakdown. |
| 11 | **Trade History with Annotations** | ✅ | Notes, tags, screenshots, lesson_learned, emotional_state, trade_rating (A-F), strategy snapshots. |
| 12 | **Fee Composition Breakdown** | ✅ | Commission, funding fees, and platform fees tracked independently. Net PnL = `realized_pnl - commission - funding_fees`. |
| 13 | **Order Type Performance** | ✅ | Market/Limit/Stop order analysis with win rate and PnL comparison. |

### 🚀 Innovation Features (Beyond Requirements)

| Feature | Description |
|---------|-------------|
| **AI Post-Trade Analysis** | Entry timing, exit efficiency, SL placement, strategy adherence scoring |
| **Trading Health Score** | Composite 0-100 score: Sharpe (25%), Drawdown (20%), Win Rate (20%), PF (15%), Consistency (15%), Sample (5%) |
| **Emotional State Tracking** | Correlates psychological states (FOMO, Revenge, Confident, etc.) with trade outcomes |
| **Context-Aware Risk Sizing** | Auto-adjusts position size based on volatility, sentiment, events, and historical performance |
| **Strategy Builder** | Visual entry/exit rules, YouTube strategy import via AI, multi-timeframe analysis |
| **Backtesting Engine** | Historical simulation with real Klines data and session-based breakdown |
| **Trading Gate (Circuit Breaker)** | Auto-blocks trade entry at 100% daily loss limit. Warnings at 70% and 90%. |
| **Solana Wallet Login** | Web3 wallet authentication alongside Google OAuth |
| **Paper/Live Mode Isolation** | Complete data separation — simulation never contaminates live analytics |
| **Advanced Risk Metrics** | Sharpe, Sortino, Calmar, VaR (95/99), Kelly Criterion, Recovery Factor |
| **Market Intelligence** | Fear & Greed Index, economic calendar, top movers, funding rates |
| **Predictive Analytics** | Win probability estimation, risk-adjusted expected value per trade |
| **Strategy Sharing** | Share strategies via unique tokens with clone tracking |
| **Global Audit Log** | Immutable trail for all sensitive operations (trade CRUD, API keys, sync) |

---

## Calculation Formulas & Accuracy

All calculations are deterministic, auditable, and verified by **549 automated tests**.

### PnL Standard

Every PnL calculation across the platform follows a strict fallback chain:

```
Net PnL = realized_pnl ?? pnl ?? 0
```

| Source | Field Used | Why |
|--------|-----------|-----|
| Binance-synced trades | `realized_pnl` | Exact P&L from exchange settlement |
| Paper/manual trades | `pnl` | Estimated from `(exit_price - entry_price) × quantity` |

### Core Metrics

| Metric | Formula | Code Reference |
|--------|---------|---------------|
| **Win Rate** | `wins / totalTrades × 100` | `src/lib/trading-calculations.ts` |
| **Profit Factor** | `grossProfit / grossLoss` (∞ if no losses) | `src/lib/trading-calculations.ts` |
| **Expectancy** | `(winRate × avgWin) - (lossRate × avgLoss)` | `src/lib/trading-calculations.ts` |
| **R-Multiple** | `\|exit - entry\| / \|entry - stopLoss\|` (signed by outcome) | `calculateRR()` |
| **Max Drawdown** | Peak-to-trough on cumulative PnL equity curve | `calculateTradingStats()` |
| **Drawdown %** | `drawdown / (initialBalance + peak) × 100`, capped at 100% | Standardized formula |

### Advanced Risk Metrics

| Metric | Formula | Module |
|--------|---------|--------|
| **Sharpe Ratio** | `(meanReturn - Rf) / σ × √252` (Rf = 0%) | `src/lib/advanced-risk-metrics.ts` |
| **Sortino Ratio** | `meanReturn / σ_downside × √252` | `src/lib/advanced-risk-metrics.ts` |
| **Calmar Ratio** | `annualizedReturn / maxDrawdown%` | `src/lib/advanced-risk-metrics.ts` |
| **VaR (95%)** | 5th percentile of historical return distribution × capital | Historical simulation method |
| **VaR (99%)** | 1st percentile of historical return distribution × capital | Historical simulation method |
| **Kelly Criterion** | `W - (1-W) / (avgWin / avgLoss)`, clamped ≥ 0 | `src/lib/advanced-risk-metrics.ts` |
| **Recovery Factor** | `netProfit / maxDrawdown` | `src/lib/advanced-risk-metrics.ts` |

### Trading Health Score (0-100)

```
Score = (Sharpe × 25%) + (DrawdownControl × 20%) + (WinRate × 20%)
      + (ProfitFactor × 15%) + (Consistency × 15%) + (SampleSize × 5%)
```

| Component | Weight | Scoring |
|-----------|--------|---------|
| Sharpe Ratio | 25% | Normalized: ≥2.0 = 100, ≤0 = 0 |
| Drawdown Control | 20% | Normalized: ≤5% = 100, ≥50% = 0 |
| Win Rate | 20% | Normalized: ≥60% = 100, ≤30% = 0 |
| Profit Factor | 15% | Normalized: ≥3.0 = 100, ≤0.5 = 0 |
| Consistency | 15% | Streak ratio + recovery factor |
| Sample Size | 5% | ≥100 trades = 100, <10 = penalty |

### Context-Aware Risk Multipliers

Position sizing is automatically adjusted by combining these factors:

| Factor | Condition | Multiplier |
|--------|-----------|------------|
| **Volatility** | Extreme | 0.5× |
| | High | 0.75× |
| | Medium | 1.0× |
| | Low | 1.1× |
| **High-Impact Event** | Active | 0.5× |
| **Sentiment (F&G)** | < 25 (Extreme Fear) | 0.8× |
| | > 75 (Extreme Greed) | 0.9× |
| **Market Bias** | AVOID | 0.5× |
| **Momentum Score** | ≥ 70 (Strong) | 1.1× |
| | ≤ 30 (Weak) | 0.8× |
| **Historical Performance** | ≥ 60% WR (10+ trades) | 1.15× |
| | < 40% WR | 0.7× |

**Final Risk = Base Risk × Π(all multipliers)**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐    │
│  │ Pages   │  │Components│  │ Hooks & Stores  │    │
│  │ /trading│  │ Charts   │  │ useTradeStats() │    │
│  │ /perf   │  │ Cards    │  │ useTradingGate()│    │
│  │ /risk   │  │ Wizards  │  │ useRiskProfile()│    │
│  └────┬────┘  └────┬─────┘  └───────┬─────────┘    │
│       └────────────┼────────────────┘               │
│                    ▼                                 │
│         ┌──────────────────┐                        │
│         │  TanStack Query  │ ◄── Cascading          │
│         │  Cache Layer     │     Invalidation       │
│         └────────┬─────────┘                        │
└──────────────────┼──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Lovable Cloud)                 │
│  ┌────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ PostgreSQL │  │ 17 Edge   │  │ Supabase     │   │
│  │ + RLS      │  │ Functions │  │ Auth + Vault │   │
│  │ + RPCs     │  │ (Deno)    │  │              │   │
│  └────────────┘  └───────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│              External APIs                           │
│  Binance Futures │ Fear & Greed │ Economic Calendar  │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Trade Entry**: Wizard → Validation → Database (with audit log)
2. **Binance Sync**: Edge Function → HMAC Auth → Batch Insert → Cache Invalidation
3. **Analytics**: Server-side RPC (`get_trade_stats`) for canonical stats, client-side for filtered subsets
4. **Risk Gate**: Balance + Daily PnL → Threshold Check → Block/Warn/Allow

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-side stats via RPC** | Pagination-independent accuracy; no client-side aggregation drift |
| **`realized_pnl ?? pnl ?? 0` chain** | Unified calculation across Binance (exact) and paper (estimated) trades |
| **Paper/Live data isolation** | `useModeFilteredTrades` hook + `p_trade_mode` RPC parameter |
| **Immutable live trade fields** | PostgreSQL trigger prevents editing entry_price, direction, quantity for Binance trades |
| **Centralized configuration** | All thresholds in `src/lib/constants/` — shared with Edge Functions |
| **Soft-delete trades** | `deleted_at` column with 30-day recovery window |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui (40+ components) |
| **State** | Zustand (client) + TanStack React Query (server) |
| **Backend** | Lovable Cloud (PostgreSQL + Edge Functions) |
| **Edge Functions** | Deno (17 functions) |
| **AI** | Google Gemini 2.5 Flash (via Lovable AI) |
| **Auth** | Email/Password + Google OAuth + Solana Wallet |
| **Exchange** | Binance Futures API (41+ endpoints) |
| **Testing** | Vitest + Testing Library (549 tests) |
| **Charts** | Recharts |
| **PWA** | vite-plugin-pwa for installable app |

---

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Binance Futures account (optional, for live data sync)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd deriverse-trading-analytics

# Install dependencies
npm install    # or: bun install

# Start dev server
npm run dev    # or: bun dev
```

### Setup Flow

1. **Create an account** — Sign up with email or Google OAuth
2. **Choose your mode** — Paper Trading (simulation) or Live Trading
3. **Connect Binance** (optional) — The post-login onboarding guides you through:
   - Creating a **read-only** API key on Binance
   - Entering your credentials (encrypted at rest via Vault)
   - Auto-syncing your trade history
4. **Start trading & journaling** — Use the 5-step Trade Wizard or auto-import from Binance

### Page Guide

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Portfolio overview, equity curve, AI insights, goals |
| `/trading` | Trading Journal | Active/Closed/Pending trades, gallery view, enrichment |
| `/trading/:id` | Trade Detail | Deep dive: risk, timing, journal, AI post-mortem |
| `/history` | Trade History | Full filterable history with infinite scroll |
| `/performance` | Performance | Comprehensive stats, behavioral analytics, extreme outcomes |
| `/monthly` | Daily P&L | Calendar heatmap + list view of daily performance |
| `/risk` | Risk Management | Trading gate, risk profile, context-aware sizing |
| `/strategies` | Strategies | Builder, sharing, backtest integration |
| `/backtest` | Backtesting | Historical simulation engine |
| `/market-data` | Market Intelligence | Top movers, Fear & Greed, economic calendar |
| `/import` | Import & Sync | Binance sync, full recovery, Solana scanner |
| `/settings` | Settings | Profile, trading config, AI settings, export/backup |

---

## Security

### Data Protection

| Layer | Mechanism |
|-------|-----------|
| **Database** | Row-Level Security (RLS) on all 22 tables — users can only access their own data |
| **API Keys** | Encrypted at rest using Supabase Vault (`pgp_sym_encrypt`) |
| **Edge Functions** | JWT authentication required; CORS-protected |
| **Input Validation** | Centralized sanitization (`src/lib/sanitize.ts`) — HTML stripping, UUID validation, enum enforcement |
| **Trade Immutability** | PostgreSQL trigger blocks modification of core fields on live/Binance trades |
| **Audit Trail** | All sensitive actions logged to `audit_logs` table (trade CRUD, API key ops, sync events) |
| **Financial History** | `account_transactions` table is INSERT-only — no UPDATE or DELETE allowed |
| **Soft Delete** | Trades use `deleted_at` with 30-day recovery; permanent deletion after 30 days |

### Authentication

- **Email/Password** with email verification (no auto-confirm)
- **Google OAuth** via Lovable Cloud Auth
- **Solana Wallet** (Phantom, Solflare) via `@solana/wallet-adapter`
- Session-based auth with JWT tokens
- Role-based access control (user/admin) with subscription tiers (free/pro/business)

---

## Testing

The project has **549 automated tests** across 36 test files covering:

```bash
# Run all tests
npm run test    # or: bunx vitest run

# Run specific test file
npx vitest run src/lib/__tests__/trading-calculations.test.ts
```

### Test Coverage

| Category | Files | Tests | What's Tested |
|----------|-------|-------|---------------|
| **Core Calculations** | 7 | 140+ | PnL, win rate, drawdown, R-multiple, health score, risk metrics |
| **Trading Logic** | 5 | 80+ | Session detection, symbol normalization, emotional states |
| **Hooks** | 4 | 75+ | Trading gate, risk profile, context-aware risk, mode filtering |
| **Integration** | 5 | 30+ | Credential rotation, trade entry, Binance sync, strategy CRUD |
| **Contracts** | 4 | 60+ | Supabase table shapes, hook interfaces, AI endpoints, Binance API |
| **Observability** | 3 | 70+ | Error boundaries, analytics events, performance metrics |
| **State** | 3 | 45+ | Zustand stores, query cache, realtime sync |
| **E2E** | 3 | 50+ | Auth flow, trade entry, performance export |

### Key Verified Formulas

```
✓ calculateRR: Long trade entry=100, exit=110, SL=95 → R = +2.0
✓ calculateRR: Losing trade → negative R-multiple
✓ calculateRR: No stop loss → returns 0 (not null)
✓ profitFactor: $30 wins / $10 losses → PF = 3.0
✓ profitFactor: All wins → PF = Infinity
✓ maxDrawdown: Peak $20, drops to -$5 → DD = $25
✓ winRate: 1 win + 1 loss → 50%
✓ expectancy: Deterministic — same input always produces same output
✓ sharpeRatio: Zero variance → null (not 0 or NaN)
✓ kellyPercent: Clamped to ≥ 0 (never negative)
✓ VaR95: 5th percentile of sorted returns × capital
✓ healthScore: Weighted composite of 6 factors = 0-100
```

---

## Project Structure

```
src/
├── components/              # UI components (organized by domain)
│   ├── analytics/           # Charts, heatmaps, performance widgets
│   ├── chat/                # AI chatbot interface
│   ├── dashboard/           # Dashboard widgets & cards
│   ├── history/             # Trade history content & filters
│   ├── journal/             # Gallery cards, enrichment drawer
│   ├── layout/              # Sidebar, header, navigation, onboarding
│   ├── risk/                # Risk management components
│   ├── strategy/            # Strategy builder & importer
│   ├── settings/            # Settings tabs & forms
│   ├── trading/             # Trade wizard, history cards, detail views
│   └── ui/                  # 40+ shadcn/ui primitives + custom components
├── hooks/                   # Custom React hooks
│   ├── trading/             # Trade entries, stats, mode filtering
│   ├── analytics/           # Daily PnL, symbol breakdown
│   └── exchange/            # Exchange credentials, Binance connection
├── lib/                     # Core business logic
│   ├── constants/           # Centralized thresholds & configuration
│   ├── __tests__/           # Unit tests for all calculation modules
│   ├── trading-calculations.ts    # Core stats engine (JSDoc documented)
│   ├── advanced-risk-metrics.ts   # Sharpe, Sortino, VaR, Kelly (JSDoc documented)
│   ├── trading-health-score.ts    # Composite health scoring
│   ├── sanitize.ts                # Input validation & sanitization
│   ├── audit-logger.ts            # Global audit event logging
│   └── query-invalidation.ts      # Cascading cache invalidation
├── pages/                   # Route-level page components
├── features/                # Feature-specific modules (Binance, Solana)
├── contexts/                # React Context providers
├── stores/                  # Zustand state management
├── types/                   # TypeScript type definitions
└── integrations/            # Backend client & auto-generated types

supabase/
└── functions/               # 17 Deno Edge Functions
    ├── ai-preflight/              # Pre-trade AI edge analysis
    ├── backtest-strategy/         # Historical simulation engine
    ├── binance-futures/           # Binance API proxy (HMAC auth)
    ├── confluence-chat/           # AI strategy discussion
    ├── confluence-detection/      # Pattern & confluence scoring
    ├── dashboard-insights/        # AI daily insights generation
    ├── economic-calendar/         # Macro event integration
    ├── macro-analysis/            # Market regime analysis
    ├── market-analysis/           # Comprehensive market scoring
    ├── market-insight/            # Symbol-specific AI insights
    ├── post-trade-analysis/       # AI post-mortem analysis
    ├── post-trade-chat/           # Interactive trade review chat
    ├── session-analysis/          # Trading session performance
    ├── trade-quality/             # AI quality scoring (0-100)
    ├── trading-analysis/          # Strategy-level analysis
    ├── youtube-strategy-import/   # YouTube → strategy extraction
    └── send-cleanup-notification/ # Automated maintenance alerts

docs/                        # Architecture & domain documentation
├── FEATURE-MATRIX.md        # 129+ feature specifications
├── CLASS-DIAGRAM.md         # 5 Mermaid class diagrams
├── FRONTEND.md              # Component & hook architecture
├── BACKEND.md               # Edge function patterns
├── DATABASE.md              # Schema & RLS policies
├── USER_SCENARIOS.md        # 27 functional workflows
└── ARCHITECTURE_GAPS.md     # Known trade-offs registry
```

---

## Documentation

### Internal Documentation

The `docs/` directory contains comprehensive architecture documentation:

| Document | Content |
|----------|---------|
| `FEATURE-MATRIX.md` | 129+ features with Trader/System interaction mapping |
| `CLASS-DIAGRAM.md` | 5 Mermaid diagrams: Core Domain, Trade Wizard, Binance, Exchange Abstraction, Solana |
| `FRONTEND.md` | Hook architecture, component patterns, state management |
| `BACKEND.md` | Edge function signatures, auth patterns, error handling |
| `DATABASE.md` | Full schema, 22 tables, RLS policies, database functions |
| `USER_SCENARIOS.md` | 27 detailed user workflows with expected behavior |

### Code Documentation

All core calculation functions are documented with JSDoc including:
- Module-level architecture notes
- Formula descriptions with mathematical notation
- `@param`, `@returns`, `@example` annotations
- Cross-references between related modules

---

## License

MIT

---

*Built for the Deriverse Hackathon — Comprehensive Trading Analytics Challenge*
