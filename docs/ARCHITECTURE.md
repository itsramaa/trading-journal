# System Architecture

## Domain Architecture (9 Domains)

The application follows a **Menu-Driven Domain Analysis** principle where navigation structure defines system boundaries.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                             │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │       USER        │  │     SETTINGS      │  │     PLATFORM      │   │
│  │                   │  │                   │  │                   │   │
│  │ Auth.tsx          │  │ Settings.tsx      │  │ CommandPalette    │   │
│  │ Profile.tsx       │  │ ├─ Trading Config │  │ CurrencyDisplay   │   │
│  │ use-auth          │  │ ├─ AI Settings    │  │ ThemeToggle       │   │
│  │ use-user-settings │  │ ├─ Binance API    │  │ i18n              │   │
│  │ NavUser           │  │ └─ Notifications  │  │ app-store.ts      │   │
│  └─────────┬─────────┘  └─────────┬─────────┘  └───────────────────┘   │
│            │                      │                                     │
│            ▼                      ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SHARED DATA LAYER                              │  │
│  │  users_profile │ user_settings │ risk_profiles │ accounts(default)│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS DOMAIN LAYER                            │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │  ACCOUNTS   │ │   JOURNAL   │ │  ANALYTICS  │ │    RISK     │       │
│  │ (Foundation)│ │  (Core)     │ │ (Insights)  │ │ (Guardian)  │       │
│  │             │ │             │ │             │ │             │       │
│  │ Wallet      │ │ Trade Entry │ │ Performance │ │ Risk Limits │       │
│  │ Balance     │ │ Positions   │ │ Daily P&L   │ │ Calculator  │       │
│  │ Capital Flow│ │ History     │ │ Heatmap     │ │ Context     │       │
│  │ Fees/Rebates│ │ Enrichment  │ │ AI Insights │ │ Trading Gate│       │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘       │
│         │               │               │               │               │
│         └───────────────┼───────────────┼───────────────┘               │
│                         │               │                               │
│  ┌─────────────┐ ┌──────┴──────┐ ┌──────┴──────┐                       │
│  │  STRATEGY   │ │   MARKET    │ │  DASHBOARD  │                       │
│  │ (Playbook)  │ │  (Context)  │ │(Aggregation)│                       │
│  │             │ │             │ │             │                       │
│  │ Strategy Lib│ │ Sentiment   │ │ Overview    │                       │
│  │ Entry/Exit  │ │ Fear/Greed  │ │ Quick Stats │                       │
│  │ Backtest    │ │ Calendar    │ │ Widgets     │                       │
│  │ Performance │ │ Top Movers  │ │ Smart Actions│                      │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Domain Definitions

### Infrastructure Layer

| Domain | Responsibility | Key Components |
|--------|---------------|----------------|
| **USER** | Authentication, profile, session management | `Auth.tsx`, `Profile.tsx`, `use-auth`, `NavUser` |
| **SETTINGS** | User preferences, risk config, API connections | `Settings.tsx`, `TradingConfigTab`, `AISettingsTab`, `BinanceApiSettings` |
| **PLATFORM** | Cross-cutting utilities (currency, theme, i18n) | `CommandPalette`, `CurrencyDisplay`, `app-store.ts` |

### Business Domain Layer

| Domain | Role | Source of Truth | Key Hooks |
|--------|------|-----------------|-----------|
| **ACCOUNTS** | Foundation - Capital source | Binance `/fapi/v2/balance` | `useBinanceTotalBalance`, `useAccounts` |
| **JOURNAL** | Core - Trade lifecycle | Binance + `trade_entries` enrichment | `useTradeEntries`, `useBinancePositions` |
| **ANALYTICS** | Insights - Performance metrics | Aggregated from JOURNAL + ACCOUNTS | `useUnifiedDailyPnl`, `useContextualAnalytics` |
| **RISK** | Guardian - Position gating | `risk_profiles` + real-time checks | `useTradingGate`, `useContextAwareRisk` |
| **STRATEGY** | Playbook - Trading systems | `trading_strategies` | `useTradingStrategies`, `useStrategyPerformance` |
| **MARKET** | Context - External conditions | External APIs (F&G, Calendar) | `useUnifiedMarketScore`, `useMarketSentiment` |
| **DASHBOARD** | Aggregation - Overview hub | All domains aggregated | Consumes all domain hooks |

## Cross-Domain Data Flow

```
                        ┌─────────────────┐
                        │  BINANCE API    │
                        │ (Source of Truth│
                        │  for Financial) │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    ACCOUNTS     │     │    JOURNAL      │     │     MARKET      │
│                 │     │                 │     │                 │
│ • Wallet Balance│     │ • Positions     │     │ • Sentiment     │
│ • Available     │     │ • Trade History │     │ • Fear/Greed    │
│ • Unrealized PnL│     │ • Enrichment    │     │ • Events        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │                 │              │
         ▼              ▼                 ▼              ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      RISK       │  │   ANALYTICS     │  │    STRATEGY     │
│                 │  │                 │  │                 │
│ • Daily Loss %  │  │ • Performance   │  │ • Win Rate      │
│ • Position Gate │  │ • P&L Charts    │  │ • Entry/Exit    │
│ • Context Risk  │  │ • Patterns      │  │ • Validation    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │      DASHBOARD      │
                    │                     │
                    │ Aggregates ALL      │
                    │ domain data into    │
                    │ unified overview    │
                    └─────────────────────┘
```

## Dependency Matrix

```
             ACCOUNTS  JOURNAL  ANALYTICS  RISK  STRATEGY  MARKET  DASHBOARD
ACCOUNTS        -         ✓         ✓        ✓       -         -        ✓
JOURNAL         ✓         -         ✓        ✓       ✓         ✓        ✓
ANALYTICS       -         -         -        -       ✓         ✓        ✓
RISK            -         -         -        -       -         ✓        ✓
STRATEGY        -         -         -        -       -         ✓        ✓
MARKET          -         -         -        -       -         -        ✓
DASHBOARD       -         -         -        -       -         -        -

Legend: ✓ = Row domain consumes data from Column domain
```

## Provider Stack

```tsx
<QueryClientProvider client={queryClient}>
  <ThemeProvider attribute="class" defaultTheme="dark">
    <TooltipProvider>
      <BrowserRouter>
        <SidebarProvider>
          <MarketContextProvider>
            <Routes />
            <AIChatbot />
            <Toaster />
          </MarketContextProvider>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

## State Management Strategy

| Type | Technology | Use Case |
|------|-----------|----------|
| **Server State** | React Query | API data, Supabase queries, caching |
| **Global UI State** | Zustand (`app-store.ts`) | Currency, notifications, search, chatbot |
| **Shared Context** | React Context (`MarketContext`) | Global symbol selection |
| **Local State** | `useState` | Component-specific UI state |

## Navigation Structure

### Sidebar Groups (Menu-Driven Domains)

```
DASHBOARD (standalone)
  └─ /                    → Dashboard.tsx

ACCOUNTS (standalone)
  └─ /accounts            → Accounts.tsx
  └─ /accounts/:id        → AccountDetail.tsx

MARKET
  ├─ /market              → MarketInsight.tsx
  ├─ /market-data         → MarketData.tsx
  ├─ /calendar            → EconomicCalendar.tsx
  └─ /top-movers          → TopMovers.tsx

JOURNAL
  ├─ /trading             → TradingJournal.tsx
  └─ /history             → TradeHistory.tsx

RISK
  ├─ /risk                → RiskManagement.tsx
  └─ /calculator          → PositionCalculator.tsx

STRATEGY
  ├─ /strategies          → StrategyManagement.tsx
  └─ /backtest            → Backtest.tsx

ANALYTICS
  ├─ /performance         → Performance.tsx
  ├─ /daily-pnl           → DailyPnL.tsx
  ├─ /heatmap             → TradingHeatmap.tsx
  └─ /ai-insights         → AIInsights.tsx

SETTINGS
  └─ /settings            → Settings.tsx

USER (NavUser dropdown)
  ├─ /profile             → Profile.tsx
  └─ /notifications       → Notifications.tsx

UTILITY
  ├─ /export              → BulkExport.tsx
  └─ /shared/strategy/:token → SharedStrategy.tsx
```

## Data Architecture

### Binance-Centered Model

```
┌─────────────────────────────────────────────────────────────┐
│                    BINANCE API                              │
│              (Source of Truth - Financial)                  │
│                                                             │
│  /fapi/v2/balance    → Wallet balance, available, PnL      │
│  /fapi/v2/positionRisk → Open positions                    │
│  /fapi/v1/userTrades → Trade history                       │
│  /fapi/v1/income     → Fees, funding, rebates              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 ENRICHMENT LAYER                            │
│                (Supabase Database)                          │
│                                                             │
│  trade_entries                                              │
│  ├─ binance_trade_id  → Links to Binance                   │
│  ├─ notes, tags       → User enrichment                    │
│  ├─ strategy_id       → Strategy link                      │
│  ├─ market_context    → Captured context                   │
│  ├─ ai_quality_score  → AI assessment                      │
│  └─ screenshots       → Trade screenshots                  │
│                                                             │
│  trading_strategies   → Strategy definitions               │
│  risk_profiles        → Risk parameters                    │
│  user_settings        → Preferences, AI config             │
└─────────────────────────────────────────────────────────────┘
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
    ├── trade-quality/
    ├── macro-analysis/
    └── ...
```

## Key Integration Patterns

### 1. Binance API Proxy

```
Frontend Hook → Edge Function → Binance API
                    │
                    ├─ HMAC SHA256 signing
                    ├─ API key from secrets
                    └─ Response transformation
```

### 2. AI Feature Enforcement

```
useAISettingsEnforcement
    │
    ├─ shouldRunAIFeature(feature) → boolean
    ├─ filterByConfidence(items) → filtered items
    ├─ getSuggestionStyle() → conservative/balanced/aggressive
    └─ Read from user_settings.ai_settings
```

### 3. Trading Gate System

```
useTradingGate
    │
    ├─ Check daily loss limit vs risk_profiles
    ├─ Check max concurrent positions
    ├─ Check AI quality score average
    ├─ Check market context score
    └─ Returns: { canTrade, warnings[], blockers[] }
```

### 4. Realtime Subscriptions

```
Supabase Realtime
    │
    ├─ accounts → balance updates
    ├─ account_transactions → capital flow
    ├─ trade_entries → new trades
    └─ Auto invalidates React Query cache
```

## Security Architecture

- **Authentication**: Supabase Auth (email/password + Google OAuth)
- **Authorization**: Row Level Security (RLS) on all tables
- **API Keys**: Stored in Supabase Secrets (never in code)
- **Edge Functions**: Server-side only, CORS protected
- **File Storage**: Private buckets with RLS policies
