# System Architecture

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
├──────────────────────────────────────────────────────────────────┤
│  Pages              Components           Hooks                   │
│  ├─ Dashboard       ├─ /dashboard        ├─ use-accounts         │
│  ├─ TradingJournal  ├─ /journal          ├─ use-trade-entries    │
│  ├─ StrategyMgmt    ├─ /strategy         ├─ use-binance-*        │
│  ├─ Performance     ├─ /analytics        ├─ use-risk-*           │
│  ├─ RiskManagement  ├─ /risk             └─ ...                  │
│  └─ ...             └─ /ui (shadcn)                              │
├──────────────────────────────────────────────────────────────────┤
│                    STATE MANAGEMENT                               │
│  Zustand: app-store.ts (currency, notifications, search)        │
│  React Query: Server state, caching, background sync             │
│  Context: MarketContext (global symbol selection)                │
├──────────────────────────────────────────────────────────────────┤
│                    BACKEND (Lovable Cloud / Supabase)            │
│  Database            Edge Functions         Auth                 │
│  ├─ accounts         ├─ binance-futures     ├─ Email/Password   │
│  ├─ trade_entries    ├─ binance-market-data │                    │
│  ├─ risk_profiles    ├─ ai-preflight        │                    │
│  └─ ...              └─ ...                 │                    │
├──────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                              │
│  Binance Futures API    Fear & Greed Index    Economic Calendar │
└──────────────────────────────────────────────────────────────────┘
```

## Provider Stack

```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider attribute="class" defaultTheme="dark">
    <TooltipProvider>
      <BrowserRouter>
        <MarketContextProvider>
          <Routes />
          <AIChatbot />
        </MarketContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

## Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│  React Component │
└────────┬────────┘
         │ calls hook
         ▼
┌─────────────────┐
│  Custom Hook    │ (use-binance-*, use-trade-*)
└────────┬────────┘
         │ invokes
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Supabase Client│────►│  Edge Function  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Database       │     │  External API   │
│  (Supabase)     │     │  (Binance)      │
└─────────────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
┌─────────────────────────────────┐
│  React Query Cache              │
└────────────────┬────────────────┘
                 │ updates
                 ▼
┌─────────────────────────────────┐
│  UI Re-renders                  │
└─────────────────────────────────┘
```

## Project Structure

```
src/
├── components/         # UI components by domain
│   ├── ui/            # shadcn primitives (50+ components)
│   ├── dashboard/     # Dashboard widgets
│   ├── journal/       # Trade journal components
│   ├── risk/          # Risk management
│   ├── strategy/      # Strategy components
│   ├── analytics/     # Charts & visualizations
│   ├── trade/         # Trade entry wizard
│   ├── market/        # Market widgets
│   ├── market-insight/# Market insight tabs
│   ├── trading/       # Binance trading components
│   ├── settings/      # Settings components
│   ├── accounts/      # Account management
│   ├── chat/          # AI chatbot
│   └── layout/        # Sidebar, Header, Navigation
│
├── features/          # Feature-specific hooks & types
│   ├── binance/       # Binance API integration
│   ├── ai/            # AI hooks
│   ├── calendar/      # Economic calendar
│   ├── market-insight/# Market analysis
│   └── trade/         # Trade validation
│
├── hooks/             # Shared hooks (40+ hooks)
├── pages/             # Route components (20+ pages)
├── store/             # Zustand stores
├── contexts/          # React contexts
├── types/             # TypeScript definitions
├── lib/               # Utilities & calculations
└── integrations/      # Supabase client

supabase/
└── functions/         # Edge functions (16 functions)
    ├── binance-futures/
    ├── binance-market-data/
    ├── ai-preflight/
    └── ...
```

## Navigation Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Overview, performance summary |
| `/trading` | TradingJournal | Trade management, wizard |
| `/history` | TradeHistory | Trade history standalone |
| `/strategies` | StrategyManagement | Strategy library |
| `/backtest` | Backtest | Strategy backtesting |
| `/performance` | Performance | Analytics, charts |
| `/daily-pnl` | DailyPnL | P&L breakdown |
| `/heatmap` | TradingHeatmap | Performance heatmap |
| `/ai-insights` | AIInsights | AI analysis page |
| `/risk` | RiskManagement | Risk settings, tracking |
| `/calculator` | PositionCalculator | Position sizing |
| `/market` | MarketInsight | Market sentiment |
| `/market-data` | MarketData | Market data widgets |
| `/calendar` | EconomicCalendar | Economic events |
| `/top-movers` | TopMovers | Price movers |
| `/accounts` | Accounts | Account management |
| `/export` | BulkExport | CSV export |
| `/settings` | Settings | User preferences |
| `/profile` | Profile | User profile |
| `/notifications` | Notifications | Notification center |
| `/auth` | Auth | Login/Signup |
| `/shared/strategy/:token` | SharedStrategy | Shared strategy view |

## Key Integrations

### Binance Futures
- Source of Truth untuk financial data
- Authenticated via HMAC SHA256
- Proxy melalui Edge Function

### AI (Lovable AI)
- Pre-trade validation
- Trade quality scoring
- Dashboard insights
- Post-trade analysis

### Realtime
- Supabase Realtime subscriptions
- Tables: accounts, trade_entries, trading_strategies
- Auto query invalidation
