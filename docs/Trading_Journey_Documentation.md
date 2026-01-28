# Trading Journey - Complete End-to-End Documentation

## 1. Project Overview

**Nama Project:** Trading Journey  
**Teknologi:** React + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)  
**Tujuan:** Aplikasi trading journal dengan AI integration untuk membantu trader crypto meningkatkan performa trading

### Single Source of Truth
`docs/Trading_Journey_User_Flow.md` (1950 lines) - Semua keputusan arsitektur mengikuti dokumen ini

---

## 2. Application Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + Vite | UI Framework |
| Styling | Tailwind CSS + shadcn/ui | Design System |
| State Management | Zustand + React Query | Global & Server State |
| Backend | Supabase (Lovable Cloud) | Database, Auth, Edge Functions |
| AI | Lovable AI (Gemini 2.5 Flash) | Trading Analysis & Recommendations |

### Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)               │
├──────────────────────────────────────────────────────────────┤
│  Pages (10)        Components           Hooks (19)           │
│  ├─ Dashboard      ├─ /chat             ├─ use-accounts      │
│  ├─ TradingJournal ├─ /dashboard        ├─ use-auth          │
│  ├─ StrategyMgmt   ├─ /trade/entry      ├─ use-trade-entries │
│  ├─ Analytics      ├─ /risk             ├─ use-trading-gate  │
│  ├─ RiskManagement ├─ /analytics        ├─ use-risk-profile  │
│  ├─ Sessions       ├─ /strategy         └─ ... (14 more)     │
│  ├─ MarketCalendar ├─ /accounts                              │
│  ├─ AIAssistant    ├─ /settings         Features (6)         │
│  ├─ Settings       └─ /ui (50+)         ├─ useAIPreflight    │
│  └─ Auth                                 ├─ useAIConfluence   │
├──────────────────────────────────────────────────────────────┤
│                    STATE MANAGEMENT                           │
│  ├─ Zustand (app-store.ts) - Currency, Notifications, Search │
│  ├─ Zustand (useTradeEntryWizard) - 7-Step Wizard State      │
│  └─ React Query - Server State Caching & Sync                │
├──────────────────────────────────────────────────────────────┤
│                    SUPABASE (LOVABLE CLOUD)                   │
│  Database (12 tables)     Edge Functions (8)     Auth        │
│  ├─ accounts              ├─ ai-preflight        ├─ Email    │
│  ├─ trade_entries         ├─ confluence-detection│           │
│  ├─ trading_strategies    ├─ trade-quality      Storage     │
│  ├─ trading_sessions      ├─ trading-analysis   ├─ avatars  │
│  ├─ risk_profiles         ├─ dashboard-insights │           │
│  ├─ risk_events           ├─ post-trade-analysis│           │
│  ├─ daily_risk_snapshots  ├─ session-analysis   │           │
│  └─ ... (5 more)          └─ check-permission   │           │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Structure

```text
📊 DASHBOARD        → /           → Overview, Performance, AI Insights
📝 TRADE MANAGEMENT → /trading    → Trade Journal, Entry Wizard
⚙️ STRATEGY & RULES → /strategies → Strategy Library, Rules Builder
📈 ANALYTICS        → /analytics  → Performance Charts, AI Patterns
⚠️ RISK MANAGEMENT  → /risk       → Daily Loss Tracker, Calculator
🗓️ SESSIONS         → /sessions   → Trading Sessions Management
📅 CALENDAR & MARKET→ /market     → Market Sentiment, Calendar
🎯 TRADE QUALITY    → /ai         → AI Trade Quality Checker
⚙️ SETTINGS         → /settings   → Profile, Notifications, AI Config
💳 ACCOUNTS         → /accounts   → Trading Accounts Management
```

---

## 4. Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `accounts` | Trading/Backtest/Funding accounts | balance, account_type, currency |
| `trade_entries` | Individual trades | pair, direction, entry_price, pnl, ai_quality_score |
| `trading_strategies` | Strategy definitions | entry_rules, exit_rules, min_confluences, valid_pairs |
| `trading_sessions` | Trading session tracking | mood, rating, pnl, trades_count |
| `risk_profiles` | User risk parameters | max_daily_loss_percent, risk_per_trade_percent |
| `daily_risk_snapshots` | Daily risk tracking | starting_balance, current_pnl, trading_allowed |
| `risk_events` | Risk event audit trail | event_type, trigger_value, threshold_value |
| `user_settings` | User preferences | ai_settings, notification_preferences |

### Key Relationships

```text
user (auth.users)
  └── accounts (1:N)
  └── trade_entries (1:N)
        └── trade_entry_strategies (N:M) ── trading_strategies
  └── trading_sessions (1:N)
        └── trade_entries (1:N)
  └── risk_profiles (1:1)
  └── daily_risk_snapshots (1:N)
  └── risk_events (1:N)
```

### RLS Policies
All tables have Row-Level Security enabled: `auth.uid() = user_id`

---

## 5. Feature Documentation

### 5.1 Trade Entry Wizard (7 Steps)

**Location:** `src/components/trade/entry/`  
**State Manager:** `src/features/trade/useTradeEntryWizard.ts`

```text
Step 1: PRE-ENTRY VALIDATION
├── Daily loss limit check
├── Position limit check
├── Correlation check
└── AI Pre-flight analysis (edge function: ai-preflight)

Step 2: STRATEGY SELECTION
├── Strategy list with AI quality scores
├── AI strategy recommendations
└── Entry/exit rules display

Step 3: TRADE DETAILS
├── Pair selection (BTC, ETH, BNB, etc.)
├── Direction (LONG/SHORT)
├── Timeframe selection
└── Entry price (market/limit)

Step 4: CONFLUENCE VALIDATION
├── Strategy rules checklist
├── AI confluence detection (edge function: confluence-detection)
├── Minimum 4 confluences required
└── AI confidence score

Step 5: POSITION SIZING
├── Auto-calculated from risk profile
├── Position size calculator
├── Capital deployment check (max 40%)
└── R:R ratio validation

Step 6: FINAL CHECKLIST
├── Emotional state selection (calm/anxious/fomo)
├── Confidence level (1-10)
├── AI quality score (edge function: trade-quality)
└── AI final verdict

Step 7: CONFIRMATION & EXECUTE
├── Full trade summary
├── Risk breakdown
└── Execute button
```

**State Types:**
```typescript
interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  preValidation: PreValidationResult | null;
  selectedStrategyId: string | null;
  strategyDetails: TradingStrategyEnhanced | null;
  tradeDetails: TradeDetailsData | null;
  confluences: ConfluenceData | null;
  positionSizing: PositionSizeResult | null;
  finalChecklist: FinalChecklistData | null;
  tradingAccountId: string | null;
  accountBalance: number;
}
```

### 5.2 AI Floating Chatbot

**Location:** `src/components/chat/`  
**Documentation:** `docs/AI_Floating_Chatbot.md`

**States:**
| State | Size | Features |
|-------|------|----------|
| Closed | 56x56px FAB | Sparkles icon |
| Minimized | 288x56px | Header only |
| Open (Compact) | 384x520px | Chat + suggestions |
| Expanded | Full viewport | Chat + Quick Actions + Tips |

**Components:**
```text
src/components/chat/
├── AIChatbot.tsx          # Main container, state management
├── ChatMessage.tsx        # Individual message rendering
├── QuickActionsPanel.tsx  # Left panel (expanded mode)
└── TipsPanel.tsx          # Right panel (expanded mode)
```

**Quick Actions Categories:**
- ANALISIS: Analisis Performa, Win Rate & Metrics
- STRATEGI: Pattern Terbaik, Strategi Rekomendasi
- IMPROVEMENT: Kelemahan Trading, Tips Improvement

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| Enter | Send message |
| Escape | Collapse/close |

### 5.3 Risk Management System

**Location:** `src/components/risk/`, `src/pages/RiskManagement.tsx`

**Components:**
```text
├── DailyLossTracker.tsx      # Gauge showing daily loss usage
├── PositionSizeCalculator.tsx # Interactive calculator
├── CorrelationMatrix.tsx      # Asset correlation display
├── RiskSummaryCard.tsx        # Overview metrics
└── RiskEventLog.tsx           # Audit trail display
```

**Risk Profile Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| risk_per_trade_percent | 2% | Max risk per trade |
| max_daily_loss_percent | 5% | Daily loss limit |
| max_weekly_drawdown_percent | 10% | Weekly drawdown limit |
| max_position_size_percent | 40% | Max capital deployment |
| max_correlated_exposure | 0.75 | Correlation threshold |
| max_concurrent_positions | 3 | Max open positions |

**Auto-Lock System:**
- 70%: Warning notification
- 90%: Danger notification
- 100%: Trading disabled until next day

### 5.4 Strategy Rules Builder

**Location:** `src/components/strategy/`  
**Types:** `src/types/strategy.ts`

**Entry Rule Types:**
```typescript
type EntryRuleType = 
  | 'price_action'  // S/R levels, patterns
  | 'volume'        // Volume confirmation
  | 'indicator'     // RSI, MACD, etc.
  | 'higher_tf'     // Higher timeframe alignment
  | 'on_chain'      // On-chain metrics
  | 'sentiment';    // Market sentiment
```

**Exit Rule Types:**
```typescript
type ExitRuleType = 
  | 'take_profit'   // Fixed TP
  | 'stop_loss'     // Fixed SL
  | 'trailing_stop' // Trailing stop
  | 'time_based';   // Time-based exit

type ExitRuleUnit = 'percent' | 'atr' | 'rr' | 'pips';
```

### 5.5 Analytics & Performance

**Location:** `src/pages/trading-journey/Performance.tsx`, `src/components/analytics/`

**Components:**
```text
├── DrawdownChart.tsx        # Equity curve with drawdown
├── TradingHeatmap.tsx       # Performance by day/hour
├── CryptoRanking.tsx        # Best performing pairs
└── AIPatternInsights.tsx    # AI-detected patterns
```

**Metrics Tracked:**
- Win Rate
- Profit Factor
- Average Win/Loss
- Max Drawdown
- Consecutive Wins/Losses
- Performance by Strategy
- Performance by Timeframe
- Performance by Market Condition

---

## 6. Edge Functions (AI Integration)

### Function Overview

| Function | Purpose | Model | I/O |
|----------|---------|-------|-----|
| `ai-preflight` | Pre-trade validation | Gemini 2.5 Flash | Trade setup → Verdict |
| `confluence-detection` | Detect confluences | Gemini 2.5 Flash | Chart data → Confluences |
| `trade-quality` | Quality score 1-10 | Gemini 2.5 Flash | Trade params → Score |
| `trading-analysis` | General chat analysis | Gemini 2.5 Flash | Question → Response (SSE) |
| `dashboard-insights` | Portfolio summary | Gemini 2.5 Flash | Trades → Insights |
| `post-trade-analysis` | Post-trade review | Gemini 2.5 Flash | Closed trade → Lessons |
| `session-analysis` | Session review | Gemini 2.5 Flash | Session data → Analysis |
| `check-permission` | Feature permission | N/A | User → Boolean |

### AI Request/Response Patterns

**Non-Streaming (invoke):**
```typescript
const { data, error } = await supabase.functions.invoke('trade-quality', {
  body: { tradeSetup, confluenceData, positionSizing }
});
```

**Streaming (fetch + SSE):**
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/trading-analysis`, {
  method: 'POST',
  body: JSON.stringify({ trades, strategies, question }),
});
// Parse SSE stream line-by-line
```

---

## 7. Hooks Reference

### Data Hooks
| Hook | Purpose | Returns |
|------|---------|---------|
| `use-accounts` | Account CRUD | { accounts, createAccount, updateAccount } |
| `use-trade-entries` | Trade management | { entries, addEntry, updateEntry } |
| `use-trading-strategies` | Strategy management | { strategies, createStrategy } |
| `use-trading-sessions` | Session management | { sessions, createSession } |
| `use-risk-profile` | Risk profile | { profile, updateProfile } |
| `use-daily-pnl` | Daily P&L calculation | { dailyPnL, startingBalance } |
| `use-risk-events` | Risk event log | { events, logEvent } |

### Feature Hooks
| Hook | Purpose | Returns |
|------|---------|---------|
| `useAIPreflight` | Pre-flight check | { analyze, result, isLoading } |
| `useAIConfluenceDetection` | Confluence detection | { detect, result, isLoading } |
| `useAITradeQuality` | Quality scoring | { getQualityScore, result } |
| `useDashboardInsights` | Dashboard AI | { insights, isLoading } |
| `usePreTradeValidation` | Pre-trade checks | { validate, result } |
| `useTradeEntryWizard` | Wizard state machine | { state, actions } |

### Utility Hooks
| Hook | Purpose |
|------|---------|
| `use-auth` | Authentication state |
| `use-realtime` | Supabase realtime subscriptions |
| `use-trading-gate` | Trading permission check |
| `use-mobile` | Responsive breakpoint detection |

---

## 8. State Management

### Zustand Stores

**1. App Store (`src/store/app-store.ts`):**
```typescript
interface AppState {
  currencyPair: CurrencyPair;
  currency: Currency;
  exchangeRate: number;
  notifications: Notification[];
  searchQuery: string;
  isSearchOpen: boolean;
  // + actions
}
```

**2. Trade Entry Wizard (`src/features/trade/useTradeEntryWizard.ts`):**
```typescript
interface WizardStore extends WizardState {
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPreValidation: (data: PreValidationResult) => void;
  setStrategy: (id: string, details: TradingStrategyEnhanced) => void;
  // ... more setters
  reset: () => void;
  submitTrade: (userId: string) => Promise<boolean>;
}
```

### React Query Configuration
```typescript
const queryClient = new QueryClient();
// Automatic caching, background refetch, optimistic updates
```

---

## 9. Type System

### Core Types

**Trade Entry:**
```typescript
interface TradeEntry {
  id: string;
  user_id: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  quantity: number;
  status: 'open' | 'closed';
  realized_pnl: number;
  ai_quality_score: number | null;
  ai_confidence: number | null;
  emotional_state: string | null;
  confluences_met: string[];
  pre_trade_validation: PreTradeValidation | null;
  post_trade_analysis: PostTradeAnalysis | null;
}
```

**Strategy:**
```typescript
interface TradingStrategyEnhanced {
  id: string;
  name: string;
  timeframe: TimeframeType | null;
  market_type: MarketType;
  entry_rules: EntryRule[];
  exit_rules: ExitRule[];
  valid_pairs: string[];
  min_confluences: number;
  min_rr: number;
  version: number;
  status: StrategyStatus;
}
```

**AI Types:**
```typescript
interface AITradeQualityScore {
  score: number;          // 1-10
  confidence: number;     // 0-100
  factors: QualityFactor[];
  recommendation: 'execute' | 'wait' | 'skip';
  reasoning: string;
}

interface AIConfluenceResult {
  confluences_detected: number;
  confluences_required: number;
  details: ConfluenceDetail[];
  overall_confidence: number;
  verdict: 'pass' | 'fail' | 'warning';
}
```

---

## 10. UI/UX Standards

### Spacing System (8px Grid)
- Page sections: `space-y-8`
- Card content: `space-y-4`
- Grid gaps: `gap-4 md:gap-6`

### Card Header Pattern
```tsx
<CardHeader className="flex flex-row items-center justify-between">
  <div className="flex items-center gap-2">
    <Icon className="h-5 w-5 text-primary" />
    <CardTitle>Title</CardTitle>
  </div>
  <Badge>Status</Badge>
</CardHeader>
```

### Empty State Pattern
```tsx
<div className="text-center py-12">
  <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold">No Data</h3>
  <p className="text-muted-foreground">Description here</p>
  <Button className="mt-4">CTA</Button>
</div>
```

### Responsive Breakpoints
- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (md-lg)
- Desktop: `> 1024px` (lg+)

---

## 11. File Structure

```text
src/
├── components/
│   ├── accounts/           # Account management UI
│   ├── analytics/          # Charts, heatmaps, AI insights
│   ├── chat/               # AI Floating Chatbot
│   ├── dashboard/          # Dashboard widgets
│   ├── layout/             # Sidebar, header, nav
│   ├── risk/               # Risk management components
│   ├── settings/           # Settings tabs
│   ├── strategy/           # Strategy builder components
│   ├── trade/entry/        # 7-step wizard components
│   ├── trading/            # Session, filter components
│   └── ui/                 # shadcn/ui primitives (50+)
├── features/
│   ├── ai/                 # AI integration hooks
│   └── trade/              # Trade workflow hooks
├── hooks/                  # Data & utility hooks (19)
├── integrations/supabase/  # Auto-generated client & types
├── lib/
│   ├── calculations/       # Position sizing math
│   ├── formatters.ts       # Number/date formatting
│   └── utils.ts            # Utility functions
├── pages/
│   ├── trading-journey/    # Trade management pages
│   └── *.tsx               # Main pages (10)
├── store/                  # Zustand stores
└── types/                  # TypeScript interfaces (5)

docs/
├── Trading_Journey_User_Flow.md    # Single source of truth
├── Trading_Journey_Documentation.md # This file
└── AI_Floating_Chatbot.md          # Chatbot documentation

supabase/functions/                  # Edge functions (8)
```

---

## 12. Deployment & Environment

### Environment Variables
```env
VITE_SUPABASE_URL=https://ltlaznzrqsccmczhfism.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=ltlaznzrqsccmczhfism
```

### Secrets (Supabase)
- `LOVABLE_API_KEY` - AI Gateway access
- `COINGECKO_API_KEY` - Crypto price data
- `FINNHUB_API_KEY` - Market data
- `ALPHA_VANTAGE_API_KEY` - Financial data
- `FCSAPI_API_KEY` - Forex data

### Build Commands
```bash
npm install     # Install dependencies
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview production build
```

---

## 13. Testing Checklist

### Trade Entry Flow
- [ ] Pre-validation checks run automatically
- [ ] Strategy selection shows AI recommendations
- [ ] Trade details validate pair/timeframe
- [ ] Confluence checker validates minimum rules
- [ ] Position sizing calculates correctly
- [ ] Final checklist captures emotional state
- [ ] Trade submits to database

### AI Chatbot
- [ ] FAB visible on all pages
- [ ] Compact mode opens correctly
- [ ] Expanded mode shows 3-column layout
- [ ] Quick actions populate input
- [ ] Streaming responses display token-by-token
- [ ] Clear conversation resets messages
- [ ] Escape key minimizes/closes

### Risk Management
- [ ] Daily loss tracker shows correct percentage
- [ ] Position calculator validates inputs
- [ ] Trading gate blocks when limit reached
- [ ] Risk events log automatically

---

## 14. Known Limitations

1. **No Real-Time Price Data** - Prices are manual input, no exchange integration
2. **No Backtesting Engine** - Historical strategy testing not implemented
3. **No Push Notifications** - Email only, no mobile push
4. **Single Currency** - USDT-based, no multi-currency support
5. **No Chart Integration** - No TradingView or chart overlays

---

## 15. Future Enhancements (Per Markdown)

1. AI Entry Price Optimization
2. Whale Activity Tracking
3. Real-time Market Data Integration
4. Advanced Backtesting Engine
5. Mobile App (React Native)
6. Telegram/Discord Bot Integration
7. Portfolio Advisor AI Mode

---

## 16. Related Documentation

- **Single Source of Truth:** `docs/Trading_Journey_User_Flow.md`
- **AI Chatbot Details:** `docs/AI_Floating_Chatbot.md`
- **Plan File:** `.lovable/plan.md`
