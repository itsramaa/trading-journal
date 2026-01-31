# Cross-Check Audit & Gap Remediation Plan V2

## Status: 🔄 IN PROGRESS - New Audit Cycle

**Tanggal Audit**: 2026-01-31  
**Source of Truth**: `docs/Trading_Journey_User_Flow.md`

---

## EXECUTIVE SUMMARY

Berdasarkan audit menyeluruh terhadap source of truth dan implementasi saat ini, teridentifikasi **7 kategori gap** yang perlu diperbaiki, dengan **3 gap kritis** yang harus segera ditangani.

---

## PRIORITAS 1: 🔴 TRADE HISTORY - INCOME TYPE SEPARATION (CRITICAL)

### Problem Statement
Saat ini, semua Binance income types di-import sebagai "trade" ke journal. Ini **SALAH**:

| Income Type | Seharusnya | Saat Ini |
|-------------|------------|----------|
| `REALIZED_PNL` | ✅ Trade P&L → Trade History | ✅ Correct |
| `COMMISSION` | Fee → Accounts Summary | ❌ Imported as trade |
| `FUNDING_FEE` | Funding → Accounts Summary | ❌ Imported as trade |
| `TRANSFER` | Deposit/Withdrawal → Accounts | ❌ Imported as trade |
| `COMMISSION_REBATE` | Rebate → Accounts Summary | ❌ Imported as trade |

### Root Cause
1. `useBinanceAutoSync.ts` tidak filter income type saat sync
2. Import flow di Trade History tidak membedakan P&L vs non-P&L

### Solution Tasks
- [ ] **Task 1.1**: Modify `use-binance-auto-sync.ts` - filter hanya `REALIZED_PNL`
- [ ] **Task 1.2**: Update `BinanceIncomeHistory.tsx` - add "Import to Journal" button hanya untuk P&L rows
- [ ] **Task 1.3**: Create "Financial Summary" tab di Accounts page untuk Fees/Funding/Rebates

### Files to Modify
```
src/hooks/use-binance-auto-sync.ts
src/components/trading/BinanceIncomeHistory.tsx
src/pages/Accounts.tsx
```

---

## PRIORITAS 2: 🔴 DASHBOARD - MISSING PORTFOLIO OVERVIEW (CRITICAL)

### Problem Statement (docs lines 18-50)
Dashboard seharusnya menampilkan **Portfolio Overview** di top:

| Expected (Doc) | Current | Status |
|----------------|---------|--------|
| Total Capital (USDT) | Not shown prominently | ❌ MISSING |
| Current Portfolio Value | Hidden | ❌ MISSING |
| P/L (Daily, Weekly, Monthly) | Only 7-day stats | ⚠️ PARTIAL |
| Return % | Not shown | ❌ MISSING |
| Win Rate % | In analytics summary | ✅ OK |
| Profit Factor | In analytics summary | ✅ OK |

### Solution Tasks
- [ ] **Task 2.1**: Create `PortfolioOverviewCard.tsx` component
- [ ] **Task 2.2**: Add to Dashboard as FIRST section
- [ ] **Task 2.3**: Integrate Binance wallet balance as "Total Capital"

### Files to Create/Modify
```
NEW: src/components/dashboard/PortfolioOverviewCard.tsx
MODIFY: src/pages/Dashboard.tsx
```

---

## PRIORITAS 3: 🟡 AI INSIGHTS WIDGET - INCOMPLETE FEATURES (MEDIUM)

### Problem Statement (docs lines 51-63)
AI Insights Widget missing beberapa fitur:

| Doc Requirement | Current State |
|-----------------|---------------|
| AI Summary | ✅ Implemented |
| AI Recommendation | ✅ Implemented |
| AI Risk Alert | ✅ Implemented |
| Correlation warning ("3 correlated long positions") | ❌ MISSING |
| Whale activity signals | ❌ MISSING |
| Market regime badge | ❌ MISSING (ada di MarketScoreWidget) |

### Solution Tasks
- [ ] **Task 3.1**: Add Market Regime badge dari `useUnifiedMarketScore`
- [ ] **Task 3.2**: Add Correlation risk dari position data
- [ ] **Task 3.3**: Integrate whale tracking signals (if available)

### Files to Modify
```
src/components/dashboard/AIInsightsWidget.tsx
```

---

## PRIORITAS 4: 🟡 RISK SUMMARY - MISSING CORRELATION WARNING (MEDIUM)

### Problem Statement (docs lines 39-45)
Risk Summary seharusnya menampilkan:
- ✅ Daily Loss Limit status
- ✅ Loss Today percentage
- ✅ Remaining Budget
- ✅ Positions Open count
- ❌ **Correlated Positions Warning** - MISSING

### Solution Tasks
- [ ] **Task 4.1**: Calculate correlation between open positions
- [ ] **Task 4.2**: Add warning banner if correlation > 0.7

### Files to Modify
```
src/components/risk/RiskSummaryCard.tsx
```

---

## PRIORITAS 5: 🟡 TRADE ENTRY WIZARD - MISSING AI FEATURES (MEDIUM)

### Problem Statement (docs lines 73-450)
Trade Entry Wizard missing beberapa AI features:

| Doc Feature | Current State |
|-------------|---------------|
| AI Pre-Flight Check | ✅ Implemented |
| AI Strategy Recommendation | ✅ Implemented |
| AI Entry Price Optimization | ❌ MISSING |
| AI Confluence Detection | ✅ Implemented |
| AI Position Sizing Options (Method A vs B) | ⚠️ PARTIAL |
| AI Position Monitoring Alerts | ❌ MISSING |

### Solution Tasks (Lower Priority)
- [ ] **Task 5.1**: Enhance Position Sizing UI to show "No Margin" vs "With Margin" options
- [ ] Future: Entry price optimization suggestions
- [ ] Future: Position monitoring notification system

---

## PRIORITAS 6: 🟢 ANALYTICS - MISSING SESSION SEGMENTATION (LOW)

### Problem Statement
Analytics should segment by:
- ✅ Fear/Greed zones - Implemented
- ✅ Volatility levels - Implemented
- ✅ Event days - Implemented
- ❌ **Trading Sessions** (Asian/London/NY) - MISSING
- ❌ **Day of Week** - MISSING

### Solution Tasks
- [ ] **Task 6.1**: Add session-based performance breakdown
- [ ] **Task 6.2**: Add day-of-week heatmap enhancement

---

## PRIORITAS 7: 🟢 STRATEGY - TRADE LINKING (LOW)

### Problem Statement
Strategy stats should show trades linked to each strategy.

### Solution Tasks
- [ ] **Task 7.1**: Enhance `StrategyStats.tsx` to query `trade_entry_strategies`
- [ ] **Task 7.2**: Add "View Trades" link to strategy detail

---

## IMPLEMENTATION PHASES

### Phase 1: Critical Fixes (TODAY)
```
[x] Read and audit current implementation
[ ] Task 1.1-1.3: Fix Trade History income separation
[ ] Task 2.1-2.3: Add Portfolio Overview to Dashboard
```

### Phase 2: Medium Priority (NEXT)
```
[ ] Task 3.1-3.3: Enhance AI Insights Widget
[ ] Task 4.1-4.2: Add Correlation Warning to Risk
```

### Phase 3: Polish (LATER)
```
[ ] Task 5.1: Position Sizing options UI
[ ] Task 6.1-6.2: Session analytics
[ ] Task 7.1-7.2: Strategy-trade linking
```

---

## DETAILED IMPLEMENTATION SPECS

### Task 1.1: Filter Income Types in Auto-Sync
```typescript
// In use-binance-auto-sync.ts
// BEFORE: Syncs all income
// AFTER: Filter to only REALIZED_PNL

const tradesToSync = incomeData.filter(
  (item) => item.incomeType === 'REALIZED_PNL' && item.income !== 0
);
```

### Task 2.1: PortfolioOverviewCard Component
```typescript
interface PortfolioOverviewCardProps {
  totalCapital: number;
  unrealizedPnl: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  returnPercent: number;
}

// Features:
// - Toggle between Daily/Weekly/Monthly view
// - Color-coded P&L
// - Binance live balance integration
```

### Task 3.1: Market Regime in AI Insights
```typescript
// Add to AIInsightsWidget.tsx
const { compositeScore, tradingBias } = useUnifiedMarketScore('BTCUSDT');

// Display as badge near top:
<Badge variant={tradingBias === 'bullish' ? 'success' : 'destructive'}>
  {tradingBias} regime
</Badge>
```

### Task 4.1: Correlation Calculation
```typescript
// Simple Pearson correlation for crypto pairs
// BTC-ETH typical correlation: 0.7-0.9
// If user has BTC LONG + ETH LONG, warn about correlation risk

const correlationMatrix = {
  'BTCUSDT-ETHUSDT': 0.82,
  'BTCUSDT-BNBUSDT': 0.75,
  'ETHUSDT-BNBUSDT': 0.68,
  // ... etc
};
```

---

## SUCCESS CRITERIA

After implementation:
- [ ] Trade History ONLY imports `REALIZED_PNL` as trades
- [ ] Fees, Funding, Transfers visible in Accounts > Financial Summary
- [ ] Dashboard shows Portfolio Overview with capital and P/L
- [ ] AI Insights shows Market Regime and Correlation warnings
- [ ] Risk Summary shows Correlated Positions warning

---

## PREVIOUS COMPLETED PHASES (Reference)

### Already Implemented ✅
| Component | Status |
|-----------|--------|
| DashboardAnalyticsSummary | ✅ Implemented |
| SmartQuickActions | ✅ Implemented |
| EmotionalPatternAnalysis | ✅ Implemented |
| MarketContext Provider | ✅ Implemented |
| Trading Gate AI Quality Check | ✅ Implemented |
| Backtest Filters (Event/Session/Volatility) | ✅ Implemented |
| TradingConfigTab in Settings | ✅ Implemented |
| Event Overlay in TradingHeatmap | ✅ Implemented |

---

## NOTES

- **Source of Truth**: Always refer to `docs/Trading_Journey_User_Flow.md`
- **Binance-Centered**: All financial data prioritizes Binance API
- **Local DB**: Enrichment layer only (notes, strategy links, screenshots)
