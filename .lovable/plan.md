
# REFACTOR PLAN: Trading Journey - Alignment with Markdown Specification

## Executive Summary

Setelah analisis mendalam terhadap dokumen `docs/Trading_Journey_User_Flow.md` (1950 baris) dan codebase saat ini, ditemukan **gap signifikan** antara spesifikasi dan implementasi. Dokumen Markdown menggambarkan sistem trading crypto yang sophisticated dengan integrasi AI end-to-end, sementara implementasi saat ini masih basic trading journal tanpa fitur AI yang terintegrasi.

---

## 1. Gap Analysis

### 1.1 Navigation Structure Gap

**Markdown Specification:**
```text
DASHBOARD
TRADE MANAGEMENT
STRATEGY & RULES
ANALYTICS
RISK MANAGEMENT
CALENDAR & MARKET
AI ASSISTANT
SETTINGS
```

**Current Implementation:**
```text
Dashboard
Accounts
Trading Journey (Summary, Strategies, Sessions, Journal, Performance, Insights)
Settings
```

**Status:** Partial match. Missing dedicated Risk Management, Calendar & Market, and AI Assistant menus.

---

### 1.2 Feature Gap Matrix

| Feature (per Markdown) | Current Status | Priority |
|------------------------|----------------|----------|
| Dashboard with AI Insights Widget | Missing AI widget | HIGH |
| Pre-Trade Validation (7 steps) | Missing entirely | HIGH |
| AI Confluence Detection | Missing | HIGH |
| AI Position Sizing Engine | Missing | HIGH |
| AI Trade Quality Scoring | Missing | HIGH |
| Live P&L with Current Price | Simulated only | MEDIUM |
| Risk Management Dashboard | Missing | HIGH |
| Daily Loss Limit Tracker | Missing | HIGH |
| Correlation Analysis | Missing | MEDIUM |
| AI Pattern Recognition | Basic only | MEDIUM |
| Calendar & Market Analysis | Missing | LOW |
| AI Chatbot (dedicated menu) | Partial (floating) | MEDIUM |
| Whale Tracking | Missing | LOW |
| Strategy Versioning | Missing | MEDIUM |

---

## 2. Recommended Folder Structure (Clean Architecture)

```text
src/
├── app/                          # Next.js style routing (future)
├── components/
│   ├── common/                   # Shared UI components
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorBoundary.tsx
│   ├── dashboard/
│   │   ├── AIInsightsWidget.tsx        # NEW: AI summary widget
│   │   ├── PortfolioOverview.tsx       # NEW: Portfolio summary
│   │   ├── RiskSummaryCard.tsx         # NEW: Risk status
│   │   ├── ActivePositions.tsx         # NEW: Open positions
│   │   └── SystemStatusIndicator.tsx   # NEW: Trading status
│   ├── trade/
│   │   ├── entry/                      # Trade entry flow
│   │   │   ├── PreEntryValidation.tsx  # NEW: Step 1
│   │   │   ├── StrategySelector.tsx    # Existing, enhance
│   │   │   ├── TradeDetails.tsx        # NEW: Step 3
│   │   │   ├── ConfluenceValidator.tsx # NEW: Step 4 with AI
│   │   │   ├── PositionSizing.tsx      # NEW: Step 5 with AI
│   │   │   ├── FinalChecklist.tsx      # NEW: Step 6
│   │   │   └── TradeConfirmation.tsx   # NEW: Step 7
│   │   ├── management/
│   │   │   ├── OpenPositionCard.tsx    # NEW: Live position
│   │   │   ├── TradeHistoryTable.tsx   # Existing, enhance
│   │   │   └── AITradeAnalysis.tsx     # NEW: Post-trade AI
│   │   └── journal/
│   │       └── TradeEntryForm.tsx      # Refactor existing
│   ├── strategy/
│   │   ├── StrategyCard.tsx
│   │   ├── StrategyForm.tsx            # Enhance with rules
│   │   ├── ConfluenceBuilder.tsx       # NEW: Rule builder
│   │   └── AIRuleOptimizer.tsx         # NEW: AI suggestions
│   ├── analytics/
│   │   ├── PerformanceMetrics.tsx
│   │   ├── EquityCurve.tsx
│   │   ├── DrawdownChart.tsx           # NEW
│   │   ├── TradingHeatmap.tsx          # NEW: Hour/day analysis
│   │   └── AIPatternRecognition.tsx    # NEW
│   ├── risk/                           # NEW MODULE
│   │   ├── DailyLossTracker.tsx
│   │   ├── PositionSizeCalculator.tsx
│   │   ├── CorrelationMatrix.tsx
│   │   └── RiskAlertBanner.tsx
│   ├── ai/                             # NEW MODULE
│   │   ├── AIChatInterface.tsx         # Refactor from AIChatbot
│   │   ├── AIInsightCard.tsx
│   │   ├── AIConfluenceDetector.tsx
│   │   └── AITradeRecommendation.tsx
│   └── layout/
│       ├── DashboardLayout.tsx
│       ├── AppSidebar.tsx              # Update navigation
│       └── HeaderControls.tsx
├── features/                           # Feature modules (DDD)
│   ├── dashboard/
│   │   └── useDashboardData.ts
│   ├── trade/
│   │   ├── useTradeEntry.ts            # Trade entry logic
│   │   ├── useOpenPositions.ts
│   │   └── useTradeValidation.ts       # NEW: Pre-entry checks
│   ├── strategy/
│   │   └── useStrategyPerformance.ts
│   ├── risk/                           # NEW
│   │   ├── useRiskProfile.ts
│   │   ├── useDailyLossLimit.ts
│   │   └── useCorrelationCheck.ts
│   └── ai/                             # NEW
│       ├── useAIAnalysis.ts
│       ├── useConfluenceDetection.ts
│       └── usePositionSizing.ts
├── hooks/                              # Generic hooks
│   ├── use-auth.ts
│   ├── use-realtime.ts
│   └── use-user-settings.ts
├── lib/
│   ├── calculations/
│   │   ├── trading-stats.ts            # Refactor from trading-calculations
│   │   ├── position-sizing.ts          # NEW
│   │   ├── risk-metrics.ts             # NEW
│   │   └── correlation.ts              # NEW
│   ├── api/
│   │   └── supabase.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── pages/
│   ├── Dashboard.tsx
│   ├── trading/
│   │   ├── TradeManagement.tsx         # Merge Journal + Entry
│   │   ├── StrategyRules.tsx           # Rename from StrategyManagement
│   │   ├── Analytics.tsx               # Rename from Performance
│   │   ├── Sessions.tsx
│   │   └── Insights.tsx
│   ├── risk/                           # NEW PAGE
│   │   └── RiskManagement.tsx
│   ├── ai/                             # NEW PAGE (optional)
│   │   └── AIAssistant.tsx
│   └── Settings.tsx
├── store/
│   └── app-store.ts                    # Zustand for UI state only
├── types/
│   ├── trade.ts                        # Trade-related types
│   ├── strategy.ts                     # Strategy types
│   ├── risk.ts                         # NEW: Risk types
│   └── ai.ts                           # NEW: AI response types
└── supabase/
    └── functions/
        ├── trading-analysis/           # Existing
        ├── confluence-detection/       # NEW
        ├── position-sizing/            # NEW
        ├── risk-check/                 # NEW
        └── trade-recommendations/      # NEW
```

---

## 3. Major Changes Required

### 3.1 Database Schema Updates

```sql
-- 1. Enhance trading_strategies table
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS timeframe text;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'spot';
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS entry_rules jsonb DEFAULT '[]';
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS exit_rules jsonb DEFAULT '[]';
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS valid_pairs text[] DEFAULT ARRAY['BTC', 'ETH', 'BNB'];
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS min_confluences integer DEFAULT 4;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS min_rr decimal(5,2) DEFAULT 1.5;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Create risk_profiles table
CREATE TABLE IF NOT EXISTS risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  risk_per_trade_percent decimal(5,2) DEFAULT 2.0,
  max_daily_loss_percent decimal(5,2) DEFAULT 5.0,
  max_weekly_drawdown_percent decimal(5,2) DEFAULT 10.0,
  max_position_size_percent decimal(5,2) DEFAULT 40.0,
  max_correlated_exposure decimal(5,2) DEFAULT 0.75,
  max_concurrent_positions integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create daily_risk_snapshots table
CREATE TABLE IF NOT EXISTS daily_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  starting_balance decimal(24,8) NOT NULL,
  current_pnl decimal(24,8) DEFAULT 0,
  loss_limit_used_percent decimal(5,2) DEFAULT 0,
  positions_open integer DEFAULT 0,
  capital_deployed_percent decimal(5,2) DEFAULT 0,
  trading_allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. Enhance trade_entries table
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS confluence_score integer;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS confluences_met jsonb DEFAULT '[]';
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS ai_quality_score decimal(3,1);
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS ai_confidence decimal(5,2);
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS emotional_state text;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS pre_trade_validation jsonb;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS post_trade_analysis jsonb;
```

### 3.2 Type Definitions (New/Updated)

**File: `src/types/strategy.ts`**
```typescript
export interface EntryRule {
  id: string;
  type: 'price_action' | 'volume' | 'indicator' | 'higher_tf' | 'on_chain' | 'sentiment';
  indicator?: string;
  condition: string;
  value?: string;
  is_mandatory: boolean;
}

export interface ExitRule {
  type: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'time_based';
  value: number;
  unit: 'percent' | 'atr' | 'rr' | 'pips';
}

export interface TradingStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | null;
  market_type: 'spot' | 'futures';
  entry_rules: EntryRule[];
  exit_rules: ExitRule[];
  valid_pairs: string[];
  min_confluences: number;
  min_rr: number;
  version: number;
  status: 'active' | 'paused' | 'killed';
  tags: string[] | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**File: `src/types/risk.ts`**
```typescript
export interface RiskProfile {
  id: string;
  user_id: string;
  risk_per_trade_percent: number;
  max_daily_loss_percent: number;
  max_weekly_drawdown_percent: number;
  max_position_size_percent: number;
  max_correlated_exposure: number;
  max_concurrent_positions: number;
  is_active: boolean;
}

export interface DailyRiskStatus {
  date: string;
  starting_balance: number;
  current_pnl: number;
  loss_limit: number;
  loss_used_percent: number;
  remaining_budget: number;
  trading_allowed: boolean;
  status: 'ok' | 'warning' | 'disabled';
}

export interface PositionSizeResult {
  position_size: number;
  position_value: number;
  risk_amount: number;
  capital_deployment_percent: number;
  is_valid: boolean;
  warnings: string[];
}
```

**File: `src/types/ai.ts`**
```typescript
export interface AIConfluenceResult {
  confluences_detected: number;
  confluences_required: number;
  details: ConfluenceDetail[];
  overall_confidence: number;
  verdict: 'pass' | 'fail' | 'warning';
}

export interface ConfluenceDetail {
  type: string;
  detected: boolean;
  description: string;
  confidence: number;
}

export interface AITradeQualityScore {
  score: number; // 1-10
  confidence: number; // 0-100
  factors: QualityFactor[];
  recommendation: 'execute' | 'wait' | 'skip';
  reasoning: string;
}

export interface AIPatternInsight {
  pattern_name: string;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  trade_count: number;
  recommendation: string;
}
```

---

### 3.3 Component Refactoring Details

#### A. Dashboard Refactor

**Current:** Basic metrics + account summary  
**Target:** Full trading dashboard with AI insights per Markdown

**Changes:**
1. Add `AIInsightsWidget` component showing:
   - AI Summary (portfolio status)
   - AI Recommendation (best setups)
   - AI Risk Alert (correlations, limits)
2. Add `RiskSummaryCard` with:
   - Daily loss limit status
   - Capital deployment %
   - Position count
   - Correlation warnings
3. Add `SystemStatusIndicator`:
   - Green: All systems normal
   - Yellow: Warning (limits near)
   - Red: Trading disabled
4. Add `ActivePositionsTable` for open trades with live P&L

#### B. Trade Entry Flow (New Implementation)

**Current:** Single form dialog  
**Target:** 7-step guided flow per Markdown

```text
Step 1: Pre-Entry Validation
  - Daily loss limit check
  - Position size check
  - Correlation check
  - AI pre-flight analysis

Step 2: Strategy Selection
  - Strategy dropdown with AI recommendations
  - Strategy details display
  - AI confluence assistant preview

Step 3: Trade Details
  - Pair selection with validation
  - Direction (Long/Short)
  - Timeframe validation
  - Entry price with AI optimization

Step 4: Confluence Validation
  - Checklist with AI auto-detection
  - Minimum 4 confluences (configurable)
  - AI confidence score

Step 5: Position Sizing
  - AI position sizing engine
  - Risk amount calculation
  - Capital deployment check
  - Option A vs B analysis

Step 6: Final Checklist
  - All validations summary
  - Emotional state check
  - Trade comment (AI auto-generated)
  - AI final verdict

Step 7: Confirmation & Execute
  - Review summary
  - AI monitoring setup
  - Execute button
```

**Implementation:** Multi-step wizard component with state machine

#### C. Strategy Management Enhancement

**Current:** Basic name/description/tags/color  
**Target:** Full strategy rules per Markdown

**New Form Fields:**
- Timeframe selector
- Market type (Spot/Futures)
- Valid pairs multi-select
- Entry rules builder (dynamic list):
  - Price Action at S/R (mandatory)
  - Volume Confirmation (mandatory)
  - Technical Indicators (mandatory)
  - Higher TF Confirmation (mandatory)
  - On-chain Metrics (optional)
  - Sentiment Analysis (optional)
- Exit rules:
  - Take Profit (value + unit)
  - Stop Loss (value + unit)
  - Trailing Stop (checkbox + settings)
- Minimum R:R
- Minimum confluences
- Position sizing rule
- Status toggle (Active/Paused)
- Version display

#### D. Risk Management (New Page)

**Components:**
1. `DailyLossTracker` - Real-time loss monitoring with visual gauge
2. `PositionSizeCalculator` - Interactive calculator
3. `CorrelationMatrix` - Open positions correlation
4. `RiskSettingsForm` - Risk profile configuration
5. `RiskEventLog` - History of risk triggers

#### E. AI Integration Enhancement

**Current:** Floating chatbot only  
**Target:** AI embedded throughout per Markdown

**New Edge Functions:**
1. `confluence-detection/` - Analyze confluences from trade setup
2. `position-sizing/` - Calculate optimal position size
3. `risk-check/` - Pre-trade risk validation
4. `trade-recommendations/` - Real-time trade suggestions
5. `post-trade-analysis/` - Win/loss analysis after close

**AI Integration Points:**
- Dashboard: AI Insights Widget
- Trade Entry: AI at every step
- Strategy: AI rule optimizer
- Analytics: AI pattern recognition
- Risk: AI monitoring

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Database schema updates
2. Type definitions
3. Risk profile system
4. Position size calculator component
5. Strategy form enhancement (timeframe, market, rules)

### Phase 2: Trade Entry Flow (Week 2-3)
1. Multi-step trade entry wizard
2. Pre-entry validation
3. Confluence checker (manual first)
4. Position sizing integration
5. Final checklist

### Phase 3: AI Integration (Week 3-4)
1. AI confluence detection edge function
2. AI position sizing edge function
3. AI pre-flight check
4. AI quality scoring
5. Dashboard AI widget

### Phase 4: Risk Management (Week 4-5)
1. Risk Management page
2. Daily loss tracker
3. Correlation analysis
4. Risk alerts/notifications
5. Auto-disable trading logic

### Phase 5: Analytics Enhancement (Week 5-6)
1. Trading heatmaps
2. Drawdown curve
3. AI pattern recognition
4. Performance by pair/timeframe
5. Strategy comparison

---

## 5. Technical Notes

### Risks
1. **Database Migration Complexity** - Schema changes require careful migration
2. **AI Latency** - Edge functions may add latency to trade entry flow
3. **State Management** - Multi-step wizard needs robust state handling

### Trade-offs
1. **Simplicity vs Completeness** - Full Markdown spec is ambitious; may need phased delivery
2. **AI Dependency** - Heavy AI integration may impact UX if AI is slow/unavailable
3. **Mobile Support** - Complex wizard may need different mobile flow

### Assumptions
1. Binance API integration deferred to post-MVP (manual trade sync first)
2. Whale tracking/on-chain data requires external API (not in scope)
3. Real-time price feeds use simulated data until exchange integration

### Not Refactored (Intentional)
1. **Accounts System** - Already aligned with trading focus
2. **Authentication** - Works correctly
3. **Basic UI Components** - shadcn/ui components are clean
4. **Realtime Hooks** - Already implemented correctly

---

## 6. Priority Actions (Next Sprint)

1. **Create `risk_profiles` table** with RLS policies
2. **Update `trading_strategies` table** with new columns
3. **Create `PositionCalculator.tsx`** component
4. **Create `RiskProfileSettings.tsx`** in Settings
5. **Update `StrategyManagement.tsx`** with timeframe/market/rules fields
6. **Create `use-risk-profile.ts`** hook
7. **Update navigation** to match Markdown structure

---

## 7. Success Criteria

- Strategy entity has full rules definition (entry/exit)
- Position size calculator is functional
- Risk profile is configurable
- Daily loss limit is tracked
- Trade entry flow has validation steps
- AI integration at minimum 3 touchpoints (dashboard, trade entry, post-trade)
