# Trading Journey Documentation

**Last Updated:** 2026-02-09

## Overview

Trading Journey adalah **web-based trading journal** untuk crypto futures traders dengan fitur:
- Integrasi langsung dengan **Binance Futures API**
- **AI-powered trade analysis** menggunakan Gemini 2.5 Flash
- **Risk management automation** dengan context-aware position sizing
- **Strategy backtesting** dengan data Klines real dan session performance breakdown
- **YouTube Strategy Import** dengan AI extraction dan Multi-Timeframe Analysis (MTFA)

## Target User

Crypto futures traders yang ingin:
- Mencatat dan menganalisis trading performance
- Mengelola risiko secara sistematis
- Meningkatkan edge dengan AI insights
- Backtest strategi dengan data historis
- Import strategi dari YouTube secara otomatis

## Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview performa dengan AI insights |
| **Trading Journal** | Trade entry wizard 5-step dengan validasi AI |
| **Strategy Management** | Builder rules, YouTube importer, sharing, MTFA support |
| **Backtesting** | Historical simulation dengan session breakdown analysis |
| **Risk Management** | Daily loss tracker, context-aware sizing |
| **Analytics** | P&L breakdown, heatmap, contextual analytics |
| **Market Data** | Sentiment, economic calendar, top movers |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (client) + React Query (server) |
| Backend | Supabase (Lovable Cloud) |
| Edge Functions | Deno (17 functions) |
| AI | Lovable AI (Gemini 2.5 Flash) |
| External API | Binance Futures, Fear & Greed Index |

## Documentation Structure

```
docs/
├── README.md              # This file
├── ARCHITECTURE.md        # System architecture & data flow
├── DATABASE.md            # Database schema & RLS policies
├── DOMAIN_MODEL.md        # Trading domain concepts
├── DEVELOPMENT.md         # Development guidelines
├── FEATURES.md            # Feature breakdown
├── FRONTEND.md            # Frontend architecture
├── BACKEND.md             # Edge functions & API
├── STATE_MANAGEMENT.md    # State & data flow
├── BINANCE_INTEGRATION.md # Binance API integration
├── BINANCE_AGGREGATION_ARCHITECTURE.md # Trade aggregation
├── TRADE_HISTORY_ARCHITECTURE.md       # Trade data lifecycle
└── TRADE_HISTORY_COMPLETE_FLOW.md      # Complete sync flow
```

## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Configure Binance API keys di Settings page

## Source of Truth

1. **Binance Futures API** - Primary source untuk balance, positions, P&L
2. **Supabase Database** - Enrichment layer untuk journal metadata
3. **This Documentation** - Architecture dan domain model

## Recent Updates (Feb 2026)

- **YouTube Strategy Import**: Full MTFA extraction (higher/lower timeframe), session preference, trading style
- **Backtest Session Breakdown**: Visualisasi performa per trading session (Sydney, Tokyo, London, NY)
- **Strategy Schema Enhancement**: Methodology, trading style, session preference fields
- **Backtest Auto-Apply**: Strategy settings (session, MTFA) otomatis diterapkan ke backtest

## Archive

Legacy documentation tersedia di `old-docs/` untuk referensi.
