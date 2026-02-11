# Deriverse — Trading Analytics Dashboard

A comprehensive trading analytics solution for [Deriverse](https://deriverse.io), featuring a professional trading journal, portfolio analysis, and AI-powered insights for active crypto futures traders.

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18-61dafb)

## 🎯 About

Deriverse is a next-gen, fully on-chain, and decentralized Solana trading ecosystem. This dashboard provides comprehensive analytics and journaling capabilities for traders on the platform — covering spot, perpetual, and options markets.

## ✨ Features

### A. Profit & Performance Analytics
- **Total PnL Tracking** — Cumulative profit/loss with visual indicators and percentage change
- **Historical PnL Charts + Drawdown** — Equity curve visualization with peak drawdown tracking
- **Largest Gain / Loss** — Highlights best and worst trades for risk awareness
- **Average Win / Loss** — Per-trade averages used for risk:reward ratio analysis

### B. Trading Behavior Analytics
- **Win Rate & Trade Count** — Overall win rate with total trade statistics
- **Average Trade Duration** — Mean/median hold time (scalper to swing)
- **Long / Short Ratio** — Directional bias analysis with win rate per direction
- **Order Type Performance** — P&L breakdown by market, limit, and stop orders

### C. Volume & Fee Analysis
- **Trading Volume Analysis** — Volume per asset and per timeframe
- **Fee Breakdown** — Total fees, per-asset fees, and cumulative fee tracking
- **Fee Composition** — Commission, funding fees, and slippage breakdown

### D. Filtering & UX
- **Symbol Filtering** — Filter by BTC, ETH, SOL, and any traded pair
- **Date Range Selection** — Today, Last 7 days, This Month, Custom range
- **Trade Mode Toggle** — Switch between Paper and Live trading views

### E. Time-Based Analytics
- **Time of Day Performance** — Heatmap showing profitable hours/sessions
- **Daily / Session Analysis** — Breakdown by day of week and trading session (Sydney, Tokyo, London, NY)

### F. Trading Journal
- **Trade History Table** — Complete trade log with entry/exit prices, size, P&L, fees, timestamps
- **Annotation Capability** — Add notes, lessons learned, and emotional state per trade
- **AI Trade Analysis** — Automated post-trade analysis with pattern recognition
- **Strategy Tagging** — Link trades to strategies for performance attribution

### G. Innovation Features ⭐
- **AI Pre-flight Analysis** — 5-layer edge analysis before entering trades (historical win rate, market context, correlation, expectancy)
- **AI-Powered Trade Insights** — Gemini 2.5 Flash powered analysis for patterns, mistakes, and improvement suggestions
- **Strategy Builder** — Visual entry/exit rules builder with confluence scoring
- **YouTube Strategy Import** — Extract trading strategies from YouTube videos using AI
- **Multi-Timeframe Analysis (MTFA)** — Higher/lower timeframe correlation in strategy definition
- **Backtesting Engine** — Historical simulation with session-based performance breakdown
- **Risk Management Dashboard** — Daily loss limits, position sizing calculator, drawdown tracking
- **Context-Aware Position Sizing** — Volatility-adjusted sizing with market score integration
- **Emotion Tracking** — Log emotional state per trade for behavioral pattern analysis
- **Market Sentiment Integration** — Fear & Greed Index and technical sentiment scoring

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | Zustand (client) + TanStack React Query (server) |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **AI** | Gemini 2.5 Flash (via Edge Functions) |
| **Auth** | Email/Password + Google OAuth |
| **External APIs** | Binance Futures API, Fear & Greed Index |

## 📊 Analytics Accuracy

All metrics are calculated with precision:
- **PnL** = `realized_pnl - commission - fees - funding_fees`
- **Win Rate** = `wins / (wins + losses)` (excludes breakeven)
- **Profit Factor** = `gross_profit / gross_loss`
- **R-Multiple** = `pnl / risk_amount` (based on stop loss distance)
- **Drawdown** = Peak-to-trough decline from equity high watermark

## 🚀 Getting Started

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project
cd deriverse-analytics

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 📁 Project Structure

```
src/
├── components/
│   ├── analytics/      # Chart & metric components
│   ├── chat/           # AI chatbot
│   ├── dashboard/      # Dashboard widgets
│   ├── layout/         # Sidebar, header, navigation
│   ├── risk/           # Risk management components
│   ├── strategy/       # Strategy builder & importer
│   ├── trade/          # Trade entry wizard
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Custom React hooks
├── lib/                # Utilities, calculations, formatters
├── pages/              # Route-level page components
├── contexts/           # React Context providers
├── types/              # TypeScript type definitions
└── integrations/       # Supabase client & types
```

## 🔒 Security

- Row-Level Security (RLS) on all database tables
- JWT-based authentication with secure session management
- Encrypted API key storage for exchange credentials
- No raw SQL execution — all queries use typed Supabase client
- CORS-protected Edge Functions with auth validation

## 📄 License

MIT
