
# Update FEATURE-MATRIX.md — Full System Phase Breakdown

## Objective

Menambahkan section **"System Development Phases"** di akhir `FEATURE-MATRIX.md` yang memetakan seluruh sistem (9 domain, 26 edge functions, 20+ pages, 133+ features) ke dalam phase-phase development yang logis dan berurutan berdasarkan dependency graph.

## Scope

Dokumen saat ini hanya mencakup 3 halaman (Journal, History, Import). Update ini akan **memperluas coverage** ke seluruh sistem: Dashboard, Accounts, Market (4 pages), Risk (2 pages), Strategy (2 pages), Analytics (4 pages), Settings, Profile, Notifications, Landing, Auth, dan Global Features (Chatbot, Command Palette, i18n).

## Phase Structure (15 Phases)

```
Phase 1: Foundation & Infrastructure
  - Auth system (signup/login/session)
  - Database schema (core tables: users_profile, user_settings, accounts)
  - RLS policies
  - Supabase client setup
  - Error boundaries (global + widget-level)
  - Theme system (dark/light)
  - i18n foundation

Phase 2: Platform Shell & Navigation
  - Sidebar layout with collapsible groups
  - Header with TradeModeSelector
  - Command Palette (Cmd+K)
  - ProtectedRoute wrapper
  - Lazy loading for all pages
  - Currency display system
  - Notification bell icon

Phase 3: User & Settings Domain
  - Profile page (avatar, display name, preferences)
  - Settings page (5 tabs: Binance API, Trading Config, AI Settings, Export, Backup)
  - user_settings persistence
  - Binance API key management (encrypt/store/validate)
  - AI settings enforcement hook

Phase 4: Accounts Domain (Foundation)
  - Accounts page (list, create, edit, delete)
  - Account detail page (capital flow, fee/rebate breakdown)
  - Paper account balance tracking
  - Binance balance integration (/fapi/v2/balance)
  - Account comparison analytics (side-by-side)
  - Multi-level analytics architecture (per-account, per-exchange, per-type)

Phase 5: Binance Integration Layer
  - Edge function: binance-futures (HMAC proxy, 41+ endpoints)
  - Binance hooks: useBinancePositions, useBinanceBalance, useBinanceOpenOrders
  - Position mode detection (Hedge/One-way)
  - Leverage brackets fetching
  - Commission rate fetching
  - API key validation flow

Phase 6: Market Domain (Context Provider)
  - Market Insight page (4-tab hub: Data, Calendar, AI, Combined)
  - Market Data page (Sentiment, Volatility, Whale Tracking)
  - Economic Calendar page (event timeline, impact filtering, countdown)
  - Top Movers page (gainers, losers, volume leaders)
  - Edge functions: binance-market-data, economic-calendar, macro-analysis, market-insight, market-analysis, public-ticker
  - Unified Market Score hook (4-component weighted scoring)
  - Market Alert system (Fear/Greed extremes, event proximity)
  - Fear & Greed Index integration
  - Market Context Provider (React Context)

Phase 7: Risk Domain (Guardian)
  - Risk Management page (Daily Loss Tracker, Risk Profile, Event Log, Correlation Matrix)
  - Position Calculator page (risk-based sizing, volatility SL, context warnings)
  - risk_profiles table & CRUD
  - daily_risk_snapshots tracking
  - Trading Gate system (useTradingGate)
  - Context-aware risk adjustment (5 factors: volatility, events, sentiment, momentum, performance)
  - Correlation matrix with consolidated coefficient model
  - Risk event types (warning_70, warning_90, limit_reached, trading_disabled)

Phase 8: Strategy Domain (Playbook)
  - Strategy Management page (CRUD, library, sharing)
  - trading_strategies schema (MTFA: Higher/Primary/Lower TF)
  - Entry/Exit rules builder (6 rule types)
  - Strategy form dialog
  - YouTube strategy import (AI extraction via Gemini)
  - Edge function: youtube-strategy-import
  - Strategy sharing (link + QR code generation)
  - Strategy cloning from shared/leaderboard
  - Edge function: strategy-clone-notify
  - Strategy performance tracking (useStrategyPerformance)

Phase 9: Journal Domain — Core (Trade Lifecycle)
  - Trading Journal page (Pending/Active tabs)
  - Trade Entry Wizard (Full 5-step + Express 3-step)
  - Wizard steps: Setup, Confluence, Sizing, Checklist, Confirmation
  - Trade summary stats (open positions, unrealized/realized PnL)
  - AllPositionsTable (unified paper + Binance positions)
  - Close position dialog (direction-aware PnL calculation)
  - Edit position dialog (SL/TP/Notes)
  - Trade state machine (6 states: OPENING, PARTIALLY_FILLED, ACTIVE, CLOSED, CANCELED, LIQUIDATED)
  - Mode isolation (useModeFilteredTrades)
  - Paper/Live mode toggle & SIMULATION banner
  - CryptoIcon (multi-source fallback)
  - Live Time-in-Trade column (auto-update 60s)
  - Read-only enforcement for Binance/Live trades
  - Binance open orders table (cancel order support)
  - Market context capture at entry
  - Trading Gate integration (block wizard if daily loss limit hit)

Phase 10: Journal Domain — Enrichment & AI
  - Trade Enrichment Drawer (10+ sub-features)
  - Multi-strategy linking (junction table + immutable snapshot)
  - 3-Timeframe system (Bias/Execution/Precision)
  - Screenshot upload (max 3, client-side compression)
  - Trade rating A-F
  - Custom tags
  - Rule compliance checklist
  - Notes & emotional state
  - AI Trade Analysis (on-demand)
  - AI Post-Trade Analysis (auto on close)
  - Post-Mortem section (Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence)
  - Edge functions: ai-preflight, trade-quality, post-trade-analysis, confluence-detection
  - AI Pre-flight Check (EV/R scoring: Proceed/Caution/Skip)
  - Wizard analytics tracking (conversion funnel)
  - Audit log integration

Phase 11: Trade History & Data Management
  - Trade History page (List/Gallery view toggle)
  - Cursor-based pagination (infinite scroll, 50/page)
  - 7 filter dimensions (date, result, direction, strategy, pair, session, AI score)
  - Sub-tabs: All/Binance/Paper
  - Server-side stats (RPC: get_trade_stats)
  - Quick note (inline)
  - Fee History tab (commission breakdown + trend chart)
  - Funding History tab (funding rate payments)
  - Soft delete with 30-day recovery
  - Batch enrichment for incomplete trades
  - Gallery view with LazyImage + IntersectionObserver

Phase 12: Import & Sync Engine
  - Import Trades page (tabbed: Binance/Solana)
  - Binance Full Sync panel (range selector, quota, force re-fetch)
  - Position lifecycle grouper (groupIntoLifecycles)
  - Trade aggregator (weighted avg prices, fee aggregation)
  - Aggregation validator (cross-validation: calculated vs reported PnL)
  - Sync checkpoint system (resumable sync via Zustand)
  - Sync reconciliation engine (tolerance 0.1%)
  - Sync quality scoring (Excellent/Good/Fair/Poor)
  - Sync monitoring panel (ETA, phase indicator, failure retry)
  - Sync quota management (daily limits)
  - Sync notification system (in-app + email for 3+ failures)
  - Edge functions: binance-background-sync, reconcile-balances, send-sync-failure-email
  - Solana wallet integration (Phantom/Solflare)
  - Solana trade import (scan, review, select, import)
  - DEX auto-detection (Deriverse, Drift, Zeta, Mango)
  - Duplicate protection (signature-based)

Phase 13: Analytics Domain (Insights)
  - Performance page (Win Rate, PF, Expectancy, Drawdown, Distribution)
  - Daily PnL page (breakdown, week-over-week, symbol breakdown, export CSV/PDF)
  - Trading Heatmap page (Hour x Day grid, session analysis, streaks)
  - AI Insights page (patterns, contextual, action items, pair rankings)
  - Contextual analytics (Fear/Greed zone, event day, volatility level charts)
  - Edge functions: dashboard-insights, trading-analysis

Phase 14: Dashboard Domain (Aggregation Hub)
  - Dashboard page (widget grid layout)
  - Portfolio Overview Card (capital, daily/weekly PnL, win rate)
  - Today Performance widget (7-day stats, streak)
  - Smart Quick Actions (context-aware buttons)
  - Market Score Widget (unified score + bias)
  - System Status Indicator (trading gate: green/yellow/red)
  - Market Sessions Widget (Asia/London/NY active indicator)
  - Open Positions Table (live Binance)
  - Risk Summary Card (daily loss usage + correlation warning)
  - AI Insights Widget (recommendations + market regime badge)
  - Volatility Meter Widget
  - Dashboard Analytics Summary

Phase 15: Global Features & Production Polish
  - AI Chatbot (floating, 3 modes: Analyst/Validator/Coach, session persistence)
  - Edge functions: confluence-chat, post-trade-chat
  - Bulk Export page (Journal CSV/PDF, Settings backup/restore, Binance daily PnL)
  - Edge function: weekly-report
  - Notification system (in-app center, push notifications)
  - Edge functions: send-push-notification, send-cleanup-notification
  - Global Audit Log system
  - Currency conversion display (hourly rate caching)
  - Backtest engine (real Klines, session breakdown, equity curve, comparison mode)
  - Edge function: backtest-strategy
  - Strategy Leaderboard (global shared strategies)
  - Solana Wallet Provider (global wrapper)
  - Landing page
  - PWA configuration (vite-plugin-pwa)
  - Performance optimization (React Query tuning, memoization, lazy loading)
  - Widget Error Boundary (isolate dashboard widget failures)
  - Hybrid Trading Mode enforcement (complete data isolation audit)
  - Trading Health Score (0-100 composite)
  - Advanced risk metrics (Sharpe/Sortino/VaR)
  - Edge function: sync-trading-pairs
```

## Changes to FEATURE-MATRIX.md

### What Will Be Added

1. **Section 4: Full System Phase Map** — 15 phases with dependency chain, covering all 9 domains
2. **Phase Dependency Diagram** — ASCII showing which phases depend on which
3. **Coverage per Phase** — Features count, edge functions, pages, and key components
4. **Updated Coverage Summary** — Expand from 3 pages (133 features) to full system count
5. **Updated Revision History** — New entry for phase map addition

### What Will NOT Change

- Sections 1-3 (Journal, History, Import) remain untouched
- Existing Component Coverage Map stays as-is
- Cross-references and legend unchanged

## Files Modified

| File | Change |
|------|--------|
| `docs/FEATURE-MATRIX.md` | Add Section 4 (Full System Phase Map) with 15 phases, dependency diagram, and updated summary |
