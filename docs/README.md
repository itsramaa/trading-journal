# Trading Journey Documentation

**Last Updated:** 2026-02-17

## Overview

Trading Journey is a **web-based trading journal** for crypto futures traders featuring:
- Direct integration with **Binance Futures API** (per-user credentials)
- **AI-powered trade analysis** using Gemini 2.5 Flash
- **Risk management automation** with context-aware position sizing
- **Strategy backtesting** with real Klines data and session performance breakdown
- **YouTube Strategy Import** with AI extraction and Multi-Timeframe Analysis (MTFA)
- **API Service Abstraction Layer** for easy backend migration

## Target User

Crypto futures traders who want to:
- Record and analyze trading performance
- Manage risk systematically
- Improve edge with AI insights
- Backtest strategies with historical data
- Import strategies from YouTube automatically

## Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Performance overview with AI insights, market score, trading gate |
| **Trading Journal** | 5-step trade entry wizard with AI validation |
| **Strategy Management** | Rule builder, YouTube importer, sharing, MTFA support |
| **Backtesting** | Historical simulation with session breakdown analysis |
| **Risk Management** | Daily loss tracker, context-aware position sizing, trading gate |
| **Analytics** | P&L breakdown, heatmap, contextual analytics, AI insights |
| **Market Data** | Sentiment aggregation, economic calendar, top movers |
| **Accounts** | Multi-account management with balance reconciliation |

### Advanced Analytics Suite

| Feature | Description |
|---------|-------------|
| **Streak Analysis** | Consecutive win/loss tracking with momentum vs. tilt P&L impact |
| **Tilt Detection** | 5-signal behavioral detection (frequency, sizing, loss sequences, pair scattering, session drift) |
| **What-If Simulator** | Interactive historical simulation: tighter stop-losses (MAE), confluence/R:R filters |
| **Correlation Matrix** | Empirical pair-to-pair daily P&L correlation heatmap with high-risk pair alerts |
| **Fee Analysis** | Cumulative fee AreaChart and cost-per-trade trend tracking |
| **Trading Health Score** | Composite 0-100 score (Sharpe, Drawdown, Win Rate, Profit Factor, Consistency, Sample Size) |
| **PDF Report Export** | Professional branded report with executive summary, metrics grid, symbol breakdown, risk assessment |
| **Onboarding Tour** | Interactive 10-step guide with replay functionality for new users |
| **Emotional Pattern Analysis** | AI-powered emotional state tracking and performance correlation |
| **Predictive Insights** | AI-driven forward-looking performance predictions |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (50+ components) |
| State | Zustand (client) + React Query (server) |
| Backend | Supabase (Lovable Cloud) |
| Edge Functions | Deno (25 functions) |
| AI | Lovable AI (Gemini 2.5 Flash) |
| External API | Binance Futures, Fear & Greed Index |

## Documentation Structure

```
docs/
├── README.md                          # This file - Project overview
│
├── ── Core Architecture ──
├── ARCHITECTURE.md                    # System architecture, 9 domains, data flow
├── DATABASE.md                        # Database schema, tables, RLS policies, enums
├── DOMAIN_MODEL.md                    # Trading domain concepts, P&L hierarchy, MTFA
├── FRONTEND.md                        # Frontend architecture, components, hooks
├── BACKEND.md                         # Edge functions (25), API patterns, AI integration
├── STATE_MANAGEMENT.md                # Zustand, React Query, Context, Realtime
│
├── ── Service Layer ──
├── API_SERVICE_LAYER.md               # Interface contracts, migration guide, types
│
├── ── Security ──
├── SECURITY.md                        # Encryption, RLS, JWT, credential architecture
│
├── ── Integration ──
├── BINANCE_INTEGRATION.md             # Binance API proxy, HMAC, income types
├── BINANCE_AGGREGATION_ARCHITECTURE.md # Trade aggregation pipeline
├── TRADE_HISTORY_ARCHITECTURE.md      # Trade data lifecycle
├── TRADE_HISTORY_COMPLETE_FLOW.md     # Complete sync flow
│
├── ── Features ──
├── FEATURES.md                        # Feature breakdown (all domains)
├── FEATURE-MATRIX.md                  # Feature coverage matrix
│
├── ── Development ──
├── DEVELOPMENT.md                     # Code conventions, patterns, testing
├── CLASS-DIAGRAM.md                   # Class relationships
│
├── ── Analysis & Planning ──
├── COMPLETE_DATABASE_ANALYSIS.md      # Database completeness analysis
├── ARCHITECTURE_GAPS.md               # Architecture improvement areas
├── MISMATCH_REMEDIATION_PLAN.md       # Schema-code alignment plan
├── MULTI_EXCHANGE_ARCHITECTURE.md     # Multi-exchange readiness
├── EDGE_FUNCTION_ERROR_HANDLING.md    # Error handling patterns
│
├── ── User & Evaluation ──
├── USER_SCENARIOS.md                  # User journey scenarios
├── DETAILED_USER_SCENARIO.md          # Detailed use case walkthrough
├── JUDGING_CRITERIA_EVALUATION.md     # Competition criteria evaluation
├── judge_criteria.md                  # Judging rubric
└── scope-coverage-map.md             # Feature scope coverage
```

## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Configure Binance API keys in Settings page

## Architecture Highlights

### 9-Domain Architecture
The application follows a **Menu-Driven Domain Analysis** with 9 distinct domains:
- **Infrastructure**: User, Settings, Platform
- **Business**: Accounts, Journal, Analytics, Risk, Strategy, Market, Dashboard

### API Service Layer
The `src/services/api/` layer provides backend-agnostic interfaces:
```typescript
import { services } from '@/services/api';
const trades = await services.trades.getAll(userId);
```
See [API_SERVICE_LAYER.md](./API_SERVICE_LAYER.md) for migration guide.

### Data Source Priority
1. **Binance Futures API** — Primary source for balance, positions, P&L
2. **Supabase Database** — Enrichment layer for journal metadata
3. **Paper Trading Accounts** — Internal simulation data

### Security
- Per-user credential encryption via `pgp_sym_encrypt()` + Supabase Vault
- RLS policies on every table
- JWT authentication for all Edge Functions
- See [SECURITY.md](./SECURITY.md) for details.

## Navigation Map

| Section | Route | Keyboard |
|---------|-------|----------|
| Dashboard | `/dashboard` | G D |
| Economic Calendar | `/calendar` | G C |
| Top Movers | `/top-movers` | G O |
| Flow & Liquidity | `/flow-liquidity` | G V |
| Market Bias | `/market-bias` | G M |
| Trading Journal | `/trading` | G T |
| Import & Sync | `/import` | G N |
| Risk Calculator | `/risk-calculator` | G X |
| Performance | `/performance` | G P |
| Risk Analytics | `/risk-analytics` | G R |
| Daily P&L | `/monthly` | G L |
| Heatmap | `/heatmap` | G E |
| AI Insights | `/ai-insights` | G I |
| My Strategies | `/strategies` | G S |
| Backtest | `/backtest` | G B |
| Accounts | `/accounts` | G A |
| Bulk Export | `/export` | G W |
| Settings | `/settings` | — |

## Source of Truth

1. **Binance Futures API** — Primary source for balance, positions, P&L
2. **Supabase Database** — Enrichment layer for journal metadata
3. **This Documentation** — Architecture and domain model

## Recent Updates (Feb 2026)

- **API Service Abstraction Layer**: Interface + Implementation pattern for backend migration
- **Security Documentation**: Complete credential encryption architecture
- **YouTube Strategy Import**: Full MTFA extraction (higher/lower timeframe)
- **Backtest Session Breakdown**: Performance per trading session (Sydney, Tokyo, London, NY)
- **Strategy Schema Enhancement**: Methodology, trading style, session preference fields
- **Multi-Level Analytics**: Per-account, per-exchange, per-mode, aggregate stats
- **Streak Analysis**: Consecutive win/loss run tracking with momentum vs. tilt impact
- **Tilt Detection Engine**: 5-signal behavioral analysis for revenge trading identification
- **What-If Simulator**: Interactive tool simulating impact of tighter SL or filtered trades
- **Correlation Matrix**: Empirical pair-to-pair P&L correlation heatmap with risk alerts
- **Fee Analysis Dashboard**: Cumulative fee tracking and cost-per-trade trend charts
- **Trading Health Score**: Composite 0-100 graded score (A+ to F) across 6 weighted dimensions
- **Professional PDF Export**: Branded multi-section report with verdict, metrics, symbol breakdown, risk assessment
- **Performance Onboarding Tour**: Interactive 10-step guided tour with replay button
- **Emotional Pattern Analysis**: AI-powered emotional state tracking correlated with outcomes
- **Predictive Insights**: Forward-looking AI performance predictions
- **UX Consistency Standard**: URL persistence, accessibility (aria), ErrorBoundary, skeleton loading, source badges
- **Financial Precision Standard**: Dynamic decimal precision, tabular-nums alignment, currency conversion hooks
- **Trade Replay**: Visual step-by-step playback of closed trades with price level visualization, auto-play, and timeline navigation
