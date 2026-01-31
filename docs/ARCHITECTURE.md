# System Architecture

## Application Structure

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
├──────────────────────────────────────────────────────────────┤
│  Pages              Components           Hooks               │
│  ├─ Dashboard       ├─ /dashboard        ├─ use-accounts     │
│  ├─ TradingJournal  ├─ /journal          ├─ use-trade-entries│
│  ├─ StrategyMgmt    ├─ /strategy         ├─ use-binance-*    │
│  ├─ Performance     ├─ /analytics        ├─ use-risk-*       │
│  ├─ RiskManagement  ├─ /risk             └─ ...              │
│  └─ ...             └─ /ui (shadcn)                          │
├──────────────────────────────────────────────────────────────┤
│                    STATE MANAGEMENT                           │
│  Zustand: app-store.ts (currency, notifications)             │
│  React Query: Server state, caching, sync                    │
├──────────────────────────────────────────────────────────────┤
│                    BACKEND (Lovable Cloud)                    │
│  Database            Edge Functions         Auth              │
│  ├─ accounts         ├─ binance-futures     ├─ Email/Pass    │
│  ├─ trade_entries    ├─ ai-preflight                         │
│  ├─ risk_profiles    ├─ trade-quality                        │
│  └─ ...              └─ ...                                  │
└──────────────────────────────────────────────────────────────┘
```

## Key Directories

```
src/
├── components/         # UI components by domain
│   ├── ui/            # shadcn primitives
│   ├── dashboard/     # Dashboard widgets
│   ├── journal/       # Trade journal components
│   ├── risk/          # Risk management
│   └── ...
├── features/          # Feature-specific hooks
│   ├── binance/       # Binance API integration
│   └── ai/            # AI hooks
├── hooks/             # Shared hooks
├── pages/             # Route components
├── store/             # Zustand stores
├── types/             # TypeScript definitions
└── lib/               # Utilities & calculations

supabase/functions/    # Edge functions (Deno)
```

## Data Flow

```
User Action → Hook → Supabase Client → Edge Function/Database
                                              ↓
UI Update ← React Query Cache ← Response ←────┘
```

## Navigation Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Overview, performance summary |
| `/journal` | TradingJournal | Trade management, history |
| `/strategies` | StrategyManagement | Strategy library |
| `/performance` | Performance | Analytics, charts |
| `/risk` | RiskManagement | Risk settings, tracking |
| `/accounts` | Accounts | Account management |
| `/settings` | Settings | User preferences |
