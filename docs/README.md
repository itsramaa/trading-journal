# Trading Journey Documentation

**Last Updated:** 2026-01-31

## Overview

Trading Journey adalah **web-based trading journal** untuk crypto futures traders dengan fitur:
- Integrasi langsung dengan **Binance Futures API**
- **AI-powered trade analysis** menggunakan Gemini 2.5 Flash
- **Risk management automation** dengan context-aware position sizing
- **Strategy backtesting** dengan data Klines real

## Target User

Crypto futures traders yang ingin:
- Mencatat dan menganalisis trading performance
- Mengelola risiko secara sistematis
- Meningkatkan edge dengan AI insights
- Backtest strategi dengan data historis

## Key Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview performa dengan AI insights |
| **Trading Journal** | Trade entry wizard 5-step dengan validasi AI |
| **Strategy Management** | Builder rules, YouTube importer, sharing |
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
| Edge Functions | Deno (16 functions) |
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
└── BINANCE_INTEGRATION.md # Binance API integration
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

## Archive

Legacy documentation tersedia di `old-docs/` untuk referensi.
