# Trading Journey — AI-Powered Trading Journal

A production-ready **crypto futures trading journal** with Binance integration, AI-powered analysis, strategy management, and risk automation.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-latest-646CFF)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 What is Trading Journey?

Trading Journey helps crypto futures traders **journal, analyze, and improve** their trading performance through:

- **Direct Binance Futures API** integration — auto-sync trades, balances, and positions
- **AI Trade Analysis** — post-trade review, pre-flight edge analysis, pattern recognition
- **Strategy Builder** — visual entry/exit rules, YouTube import, Multi-Timeframe Analysis
- **Backtesting Engine** — historical simulation with session-based performance breakdown
- **Risk Management** — daily loss limits, context-aware position sizing, drawdown tracking

---

## ✨ Features

### 📊 Dashboard
- Portfolio overview with equity curve chart
- AI-generated daily insights
- Market score & sentiment integration
- Goal tracking (P&L targets, win rate, drawdown limits)
- ADL risk monitoring for open positions

### 📝 Trading Journal
- 5-step trade entry wizard with AI validation
- Emotion tracking & lesson logging
- Strategy tagging with confluence scoring
- Auto-sync from Binance Futures history
- Paper trade & live trade modes

### 📈 Analytics
- P&L breakdown (daily, weekly, monthly)
- Win rate, profit factor, R-multiple tracking
- Time-of-day performance heatmap
- Session analysis (Sydney, Tokyo, London, New York)
- Per-symbol & per-direction statistics

### 🛡️ Risk Management
- Daily loss limit tracker with alerts
- Context-aware position sizing calculator
- Volatility-adjusted sizing with market score
- Max concurrent positions & correlated exposure limits
- Risk event logging

### 🧠 Strategy Management
- Visual entry/exit rules builder
- YouTube Strategy Import (AI extraction)
- Multi-Timeframe Analysis (MTFA) support
- Strategy sharing via unique tokens
- Backtest auto-apply from strategy settings

### 🔬 Backtesting
- Historical simulation with real Klines data
- Session-based performance breakdown
- Equity curve visualization
- Customizable initial capital, leverage, fees

### 🌐 Market Data
- Top movers with real-time price changes
- Fear & Greed Index integration
- Economic calendar
- AI market sentiment scoring

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | Zustand (client) + TanStack React Query (server) |
| **Backend** | Lovable Cloud (Supabase) |
| **Edge Functions** | Deno (17 functions) |
| **AI** | Gemini 2.5 Flash |
| **Auth** | Email/Password + Google OAuth |
| **External APIs** | Binance Futures, Fear & Greed Index |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── analytics/       # Charts, heatmaps, performance widgets
│   ├── chat/            # AI chatbot interface
│   ├── dashboard/       # Dashboard widgets & cards
│   ├── layout/          # Sidebar, header, navigation
│   ├── risk/            # Risk management components
│   ├── strategy/        # Strategy builder & importer
│   ├── trade/           # Trade entry wizard & history
│   └── ui/              # shadcn/ui primitives + custom UI
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, calculations, formatters
├── pages/               # Route-level page components
├── contexts/            # React Context providers
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
└── integrations/        # Backend client & types

supabase/
└── functions/           # 17 Deno edge functions
    ├── ai-preflight/
    ├── backtest-strategy/
    ├── binance-futures/
    ├── confluence-chat/
    ├── confluence-detection/
    ├── dashboard-insights/
    ├── economic-calendar/
    ├── macro-analysis/
    ├── market-analysis/
    ├── market-insight/
    ├── post-trade-analysis/
    ├── post-trade-chat/
    ├── session-analysis/
    ├── trade-quality/
    ├── trading-analysis/
    ├── youtube-strategy-import/
    └── send-cleanup-notification/

docs/                    # Architecture & domain documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd trading-journey

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Configuration

1. **Sign up** in the app
2. Go to **Settings** → add your Binance Futures API key (read-only recommended)
3. Sync your trade history from Binance
4. Start journaling!

---

## 📊 Metrics Accuracy

All calculations follow professional trading standards:

| Metric | Formula |
|--------|---------|
| **Net P&L** | `realized_pnl - commission - fees - funding_fees` |
| **Win Rate** | `wins / (wins + losses)` — excludes breakeven |
| **Profit Factor** | `gross_profit / gross_loss` |
| **R-Multiple** | `pnl / risk_amount` (based on stop loss distance) |
| **Drawdown** | Peak-to-trough decline from equity high watermark |

---

## 🔒 Security

- Row-Level Security (RLS) on all database tables
- JWT-based authentication with secure session management
- Encrypted API key storage for exchange credentials
- CORS-protected edge functions with auth validation
- Subscription-based feature gating (Free / Pro / Business)

---

## 📚 Documentation

Detailed architecture and domain docs available in [`docs/`](./docs/):

- **ARCHITECTURE.md** — System architecture & data flow
- **DATABASE.md** — Schema, RLS policies, enums
- **FRONTEND.md** — Component structure & hooks
- **BACKEND.md** — Edge functions & API patterns
- **BINANCE_INTEGRATION.md** — Binance API integration details
- **FEATURES.md** — Complete feature breakdown

---

## 📄 License

MIT
