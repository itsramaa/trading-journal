
# Comprehensive Trading Domain Cross-Check Audit & Remediation Plan V6

## Status: AUDIT COMPLETE
**Tanggal Audit**: 2026-01-31
**Basis Audit**: Dokumentasi `docs/` + Implementasi aktual + Binance Futures Domain Model

---

## SECTION A: EXECUTIVE SUMMARY

### Scope Audit
Audit ini mencakup cross-check antara:
1. **Dokumentasi** (`docs/DOMAIN_MODEL.md`, `docs/BINANCE_INTEGRATION.md`, `docs/FEATURES.md`)
2. **Implementasi aktual** (40+ komponen dan hooks)
3. **Domain trading Binance Futures** (lifecycle, income types, P&L hierarchy)

### Key Findings Summary

| Area | Status | Critical | Medium | Low |
|------|--------|----------|--------|-----|
| Income Type Separation | ✅ CORRECT | 0 | 0 | 0 |
| Trade Sync Logic | ✅ CORRECT | 0 | 0 | 0 |
| Financial Summary | ✅ CORRECT | 0 | 0 | 0 |
| Net P&L Calculation | ✅ CORRECT | 0 | 0 | 0 |
| Dashboard Portfolio Overview | ❌ MISSING | 1 | 0 | 0 |
| AI Insights Widget | ⚠️ INCOMPLETE | 0 | 2 | 0 |
| Performance P&L Display | ⚠️ INCOMPLETE | 0 | 1 | 0 |
| DailyPnL Symbol Breakdown | ❌ MOCK DATA | 0 | 1 | 0 |
| Risk Correlation Warning | ⚠️ INCOMPLETE | 0 | 1 | 0 |
| R:R Calculation | ⚠️ LIMITED | 0 | 1 | 0 |

**Total: 1 Critical, 6 Medium, 0 Low**

---

## SECTION B: DOMAIN CORRECTNESS AUDIT

### B1: Income Type Separation (✅ CORRECT)

**Dokumentasi (`DOMAIN_MODEL.md` Line 30-41):**
```
| Income Type | Domain Entity | Is Trade? |
|-------------|---------------|-----------|
| REALIZED_PNL | Trade P&L | YES |
| COMMISSION | Trading Fee | NO |
| FUNDING_FEE | Funding Cost | NO |
```

**Implementasi (`use-binance-auto-sync.ts` Line 24-25):**
```typescript
const TRADE_INCOME_TYPES = ['REALIZED_PNL'] as const;
```

**Verifikasi:**
- ✅ Hanya `REALIZED_PNL` yang di-sync sebagai trade entry
- ✅ Fee/Funding/Transfer tidak tercampur dengan trade
- ✅ Sesuai dengan domain model Binance Futures

---

### B2: Financial Summary Display (✅ CORRECT)

**Dokumentasi (`BINANCE_INTEGRATION.md` Line 397-404):**
```
| Data | Display Location |
| COMMISSION | Financial Summary |
| FUNDING_FEE | Financial Summary |
```

**Implementasi (`FinancialSummaryCard.tsx` Line 79-87):**
```typescript
return allIncome.filter((item: BinanceIncome) => {
  const category = getIncomeTypeCategory(item.incomeType);
  // Exclude 'pnl' (trades) and 'transfers'
  return category === 'fees' || category === 'funding' || category === 'rewards';
});
```

**Verifikasi:**
- ✅ Fee/Funding dipisahkan dari trade dan ditampilkan di Financial Summary
- ✅ Trading Fee, Funding Paid/Received, Rebates breakdown
- ✅ Net Trading Cost calculation

---

### B3: Net P&L Calculation (✅ CORRECT)

**Dokumentasi (`DOMAIN_MODEL.md` Line 82-97):**
```typescript
const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
```

**Implementasi (`use-binance-daily-pnl.ts` Line 150-152):**
```typescript
// Calculate net P&L: Gross - Fees - Funding + Rebates
const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
```

**Verifikasi:**
- ✅ Formula Net P&L sesuai domain model
- ✅ Funding fee handled as signed value (+/-)
- ✅ Rebates ditambahkan ke P&L

---

### B4: Trade Sync Flow (✅ CORRECT)

**Dokumentasi (`BINANCE_INTEGRATION.md` Line 279-318):**
```
useBinanceAutoSync → Fetch Income (REALIZED_PNL) → Map to trade_entries
```

**Implementasi (`use-binance-auto-sync.ts` Line 141-151):**
```typescript
// Only sync REALIZED_PNL as trade entries
const pnlRecords = newRecords.filter((r: BinanceIncome) => r.incomeType === 'REALIZED_PNL');
const tradeEntries = pnlRecords.map((r: BinanceIncome) => 
  incomeToTradeEntry(r, user.id)
);
```

**Verifikasi:**
- ✅ Filter REALIZED_PNL sebelum insert
- ✅ Mapping ke trade_entries dengan binance_trade_id
- ✅ Duplicate detection via tranId

---

## SECTION C: GAP IDENTIFICATION

### C1: CRITICAL - Dashboard Missing Portfolio Overview

**Dokumentasi (`FEATURES.md` Line 9-20):**
Komponen Dashboard seharusnya:
- TodayPerformance ✅
- SmartQuickActions ✅
- MarketScoreWidget ✅
- RiskSummaryCard ✅
- **PortfolioOverviewCard** ❌ MISSING

**Implementasi (`Dashboard.tsx`):**
- Shows 7-Day Stats (streak, trades, best/worst day)
- Shows Active Positions dari Binance
- **NO Total Capital overview at top**
- **NO Today's Net P&L (Gross - Fees)**
- **NO Portfolio Value vs Initial**

**Expected Display:**
```
┌─────────────────────────────────────────────────────┐
│ Portfolio Overview                      [Binance]   │
├─────────────────────────────────────────────────────┤
│ $12,450.00          +$245.00 (+2.0%)    68.5% WR   │
│ Total Capital       Today's Net P&L     Win Rate   │
└─────────────────────────────────────────────────────┘
```

**Impact**: User tidak melihat total capital dan Net P&L overview di entry point utama.

---

### C2: MEDIUM - AI Insights Missing Correlation Warning

**Dokumentasi (`DOMAIN_MODEL.md` Line 213-224):**
```typescript
const CRYPTO_CORRELATIONS: Record<string, number> = {
  'BTCUSDT-ETHUSDT': 0.82,
  'BTCUSDT-BNBUSDT': 0.75,
  ...
};
const CORRELATION_WARNING_THRESHOLD = 0.6;
```

**Implementasi (`AIInsightsWidget.tsx`):**
- ✅ Summary, Recommendations, Risk Alerts
- ✅ Best Setups with confidence filtering
- ✅ Pair recommendations (focus/avoid based on win rate)
- ❌ **NO Correlation warning** between open positions
- ❌ **NO Market Regime badge** (Bullish/Bearish/Neutral)

**Impact**: User tidak aware tentang correlated exposure yang meningkatkan risiko.

---

### C3: MEDIUM - AI Insights Missing Market Regime Badge

**Current**: No market regime indicator at top of AI Insights widget.

**Expected:**
```tsx
<Badge className={getBiasColor(bias)}>
  {bias} Market | Score: {score} | Vol: {volatilityLabel}
</Badge>
```

**Data Source Available**: `useUnifiedMarketScore({ symbol: 'BTCUSDT' })`

---

### C4: MEDIUM - Performance Page P&L Uses Gross Only

**Dokumentasi (`DOMAIN_MODEL.md` Line 70-79):**
```
PERIOD ANALYTICS (Daily/Weekly/Monthly)
├── Total Gross P&L
├── Total Fees (commission + funding paid)
├── Total Net P&L
```

**Implementasi (`Performance.tsx` Line 398-404):**
```tsx
<Card>
  <CardHeader><CardTitle>Total P&L</CardTitle></CardHeader>
  <CardContent>
    <div className={`${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
      {formatCurrency(stats.totalPnl)}
    </div>
  </CardContent>
</Card>
```

**Implementasi (`trading-calculations.ts` Line 144):**
```typescript
const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
```

**Issue:**
- Uses `pnl` from trade_entries
- Does NOT show Net P&L (after fees/funding)
- No breakdown: Gross → Fees → Net

**Impact**: Total P&L di Performance page tidak mencerminkan true Net P&L.

---

### C5: MEDIUM - DailyPnL Symbol Breakdown Uses Mock Data

**Implementasi (`DailyPnL.tsx` Line 58-71):**
```typescript
// Use mock aggregation - in real implementation this would come from detailed API
const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];
return symbols.slice(0, 5).map((symbol, i) => ({
  symbol,
  trades: Math.floor(weeklyStats.totalTrades / symbols.length) + ...
  pnl: weeklyStats.totalGross / symbols.length * (1 - i * 0.1),
```

**Issue:**
- Symbol breakdown adalah **hardcoded distribution**
- Tidak menggunakan data real dari `bySymbol` di hooks

**Data Source Available:**
```typescript
// use-binance-daily-pnl.ts Line 33-39
bySymbol: Record<string, { 
  pnl: number; 
  fees: number; 
  funding: number; 
  rebates: number;
  count: number;
}>
```

**Impact**: Per-symbol performance display tidak akurat.

---

### C6: MEDIUM - Risk Summary Missing Correlation Check

**Dokumentasi (`FEATURES.md` Line 209-215):**
```
Risk Management Features:
├── Daily Loss Tracker ✅
├── Risk Profile ✅
├── Correlation Matrix ✅
└── Context-Aware Risk ✅
```

**Implementasi (`RiskSummaryCard.tsx`):**
- ✅ Daily Loss Limit progress
- ✅ Remaining budget
- ✅ Trading status (allowed/disabled)
- ❌ **NO Correlation warning** between open positions

**Expected Addition:**
```
Correlated Positions: 2 pairs (0.78 avg) ⚠️
  └─ BTC + ETH, BTC + SOL
```

---

### C7: MEDIUM - R:R Calculation Returns 0 for Binance Trades

**Implementasi (`trading-calculations.ts` Line 48-66):**
```typescript
export function calculateRR(trade: TradeEntry): number {
  if (!trade.stop_loss || !trade.entry_price) return 0;
  ...
}
```

**Implementasi (`use-binance-auto-sync.ts` Line 49-71):**
```typescript
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  return {
    entry_price: 0,  // Not available from income endpoint
    exit_price: 0,
    stop_loss: null, // Not available
    ...
  };
}
```

**Issue:**
- Binance income endpoint tidak provide entry/exit/SL
- R:R calculation returns 0 untuk semua Binance-synced trades
- Tidak ada guidance untuk user enrichment

**Impact**: R:R metric tidak berguna untuk Binance trades.

---

## SECTION D: WHAT IS CORRECTLY IMPLEMENTED

| Area | Implementation | Status |
|------|----------------|--------|
| Income Type Filter | `use-binance-auto-sync.ts` - REALIZED_PNL only | ✅ |
| Financial Summary | `FinancialSummaryCard.tsx` - Fee/Funding/Rebate | ✅ |
| Net P&L Formula | `use-binance-daily-pnl.ts` - Gross - Fees + Funding | ✅ |
| Trade-Strategy Link | `trade_entry_strategies` junction table | ✅ |
| Market Context Capture | `use-capture-market-context.ts` + JSONB storage | ✅ |
| Context-Aware Risk | `use-context-aware-risk.ts` - 5 adjustment factors | ✅ |
| Daily Loss Tracker | `RiskSummaryCard.tsx` - Binance-centered | ✅ |
| Trading Gate | `use-trading-gate.ts` - blocks on limit | ✅ |
| Trade Enrichment | `TradeEnrichmentDrawer.tsx` - screenshots, notes | ✅ |
| Strategy Sharing | `share_token` + QR code generation | ✅ |

---

## SECTION E: REMEDIATION PLAN

### Phase 1: Portfolio Overview Card (CRITICAL)

**Priority**: HIGH
**Effort**: ~1 session

**Task 1.1**: Create `PortfolioOverviewCard.tsx`
```typescript
// src/components/dashboard/PortfolioOverviewCard.tsx
interface PortfolioOverviewCardProps {
  className?: string;
}

// Features:
// - Total Capital from Binance wallet balance
// - Today's Net P&L (from useBinanceDailyPnl().netPnl)
// - Weekly P&L (from useBinanceWeeklyPnl().totalNet)
// - Return % calculation
// - Win Rate badge
// - Binance connection indicator
```

**Task 1.2**: Integrate to Dashboard
- Add as FIRST widget after header
- Before 7-Day Stats section

---

### Phase 2: AI Insights Enhancement (MEDIUM)

**Priority**: MEDIUM
**Effort**: ~1 session

**Task 2.1**: Add Correlation Warning
```typescript
// Add to AIInsightsWidget.tsx
const CRYPTO_CORRELATIONS: Record<string, number> = {
  'BTCUSDT-ETHUSDT': 0.82,
  'BTCUSDT-BNBUSDT': 0.75,
  'BTCUSDT-SOLUSDT': 0.78,
  'ETHUSDT-BNBUSDT': 0.70,
  'ETHUSDT-SOLUSDT': 0.65,
};

function checkCorrelationRisk(positions: BinancePosition[]): CorrelationWarning | null {
  // Check if multiple positions are correlated > 0.6
  // Return warning with pairs and avg correlation
}
```

**Task 2.2**: Add Market Regime Badge
```typescript
// Use useUnifiedMarketScore({ symbol: 'BTCUSDT' })
<Badge variant={getBiasVariant(bias)}>
  {bias === 'BULLISH' ? <TrendingUp /> : <TrendingDown />}
  {bias} | Score: {score}
</Badge>
```

---

### Phase 3: Risk Summary Enhancement (MEDIUM)

**Priority**: MEDIUM
**Effort**: ~30 min

**Task 3.1**: Add Correlation Warning to RiskSummaryCard
- Reuse correlation check logic from Phase 2
- Display warning if 2+ positions correlated > 0.6

---

### Phase 4: Performance Net P&L Display (MEDIUM)

**Priority**: MEDIUM
**Effort**: ~1 session

**Task 4.1**: Add Net P&L Breakdown to Performance Page
```typescript
// Add new card showing:
// - Gross P&L (from trades)
// - Total Fees (from binanceStats.totalCommission)
// - Total Funding (from binanceStats.totalFunding)
// - Net P&L = Gross - Fees + Funding

// For filtered date range, aggregate from useBinanceAllIncome
```

**Task 4.2**: Update stats display to show both Gross and Net

---

### Phase 5: DailyPnL Real Symbol Breakdown (MEDIUM)

**Priority**: MEDIUM
**Effort**: ~30 min

**Task 5.1**: Replace Mock Data with Real Data
```typescript
// Current (DailyPnL.tsx Line 58-71):
// const symbols = ['BTCUSDT', 'ETHUSDT', ...] // MOCK

// Fix:
const symbolBreakdown = useMemo(() => {
  if (!binanceStats.bySymbol) return [];
  
  return Object.entries(binanceStats.bySymbol)
    .filter(([symbol]) => symbol !== 'N/A')
    .map(([symbol, data]) => ({
      symbol,
      trades: data.count,
      pnl: data.pnl,
      fees: data.fees,
      funding: data.funding,
      net: data.pnl - data.fees + data.funding + data.rebates,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}, [binanceStats.bySymbol]);
```

---

### Phase 6: R:R Handling for Binance Trades (LOW)

**Priority**: LOW
**Effort**: ~30 min

**Task 6.1**: Improve R:R Display Logic
```typescript
// In TradeHistoryCard.tsx
{rr > 0 ? (
  <span>{rr.toFixed(2)}:1</span>
) : isBinance ? (
  <span className="text-muted-foreground text-xs">
    Click "Journal" to add entry/SL data
  </span>
) : (
  <span>-</span>
)}
```

**Task 6.2**: Document in user-facing tooltip
- Explain why R:R is missing for Binance trades
- Guide user to enrich with entry/SL data

---

## SECTION F: IMPLEMENTATION PRIORITY ORDER

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Portfolio Overview Card (CRITICAL)                    │
│   Files: Dashboard.tsx, PortfolioOverviewCard.tsx (new)         │
│   Duration: ~1 session                                          │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 2: AI Insights Enhancement (MEDIUM)                      │
│   Files: AIInsightsWidget.tsx                                   │
│   Duration: ~1 session                                          │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 3: Risk Summary Enhancement (MEDIUM)                     │
│   Files: RiskSummaryCard.tsx                                    │
│   Duration: ~30 min                                             │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 4: Performance Net P&L (MEDIUM)                          │
│   Files: Performance.tsx, (optional: use-net-pnl-performance.ts)│
│   Duration: ~1 session                                          │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 5: DailyPnL Fix (MEDIUM)                                 │
│   Files: DailyPnL.tsx                                           │
│   Duration: ~30 min                                             │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 6: R:R Handling (LOW)                                    │
│   Files: TradeHistoryCard.tsx                                   │
│   Duration: ~30 min                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## SECTION G: FILES TO CREATE/MODIFY

### New Files
```
src/components/dashboard/PortfolioOverviewCard.tsx    [Phase 1]
```

### Files to Modify
```
src/pages/Dashboard.tsx                               [Phase 1]
src/components/dashboard/AIInsightsWidget.tsx         [Phase 2]
src/components/risk/RiskSummaryCard.tsx               [Phase 3]
src/pages/Performance.tsx                             [Phase 4]
src/pages/DailyPnL.tsx                                [Phase 5]
src/components/trading/TradeHistoryCard.tsx           [Phase 6]
```

---

## SECTION H: VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Dashboard shows Portfolio Overview as FIRST widget
- [ ] Portfolio Overview displays: Total Capital, Today's Net P&L, Weekly P&L
- [ ] AI Insights shows Correlation Warning if 2+ positions are correlated (>0.6)
- [ ] AI Insights shows Market Regime badge (Bullish/Bearish/Neutral)
- [ ] Risk Summary shows Correlation Warning when applicable
- [ ] Performance page displays Net P&L breakdown (Gross - Fees)
- [ ] DailyPnL Symbol Breakdown uses real data from `bySymbol`
- [ ] R:R for Binance trades shows guidance to enrich with entry/SL data
- [ ] Trade History correctly separates Binance vs Paper trades
- [ ] Financial Summary on Accounts page shows Fee/Funding/Rebate correctly

---

## SECTION I: DOCUMENTATION SYNC REQUIRED

Jika implementasi berubah, update dokumentasi:

| Change | File to Update |
|--------|----------------|
| Add PortfolioOverviewCard | `docs/FEATURES.md` - Dashboard Components |
| Add Correlation Warning | `docs/FEATURES.md` - AI Insights, Risk Management |
| Add Market Regime Badge | `docs/FEATURES.md` - AI Insights |
| Net P&L on Performance | `docs/FEATURES.md` - Analytics |
| Fix Symbol Breakdown | `docs/FEATURES.md` - Daily P&L |

---

## APPENDIX: DOMAIN MODEL REFERENCE

### Binance Futures Trading Lifecycle
```
1. OPEN POSITION → Order executed, margin locked
2. HOLD POSITION → Unrealized P&L, Funding Fee every 8h
3. CLOSE POSITION → REALIZED_PNL event, COMMISSION event
4. POST-TRADE → Journal enrichment, AI analysis
```

### Income Type → Display Location Mapping
```
REALIZED_PNL    → Trade History (synced as trade_entries)
COMMISSION      → Financial Summary (not a trade)
FUNDING_FEE     → Financial Summary (not a trade)
TRANSFER        → Transactions tab (capital flow)
REBATES         → Financial Summary (income)
```

### Correct P&L Hierarchy
```
ACCOUNT: Total Capital, Available Balance
POSITION: Entry, Mark, Unrealized P&L
TRADE: Gross P&L, Commission, Net P&L
PERIOD: Total Gross, Total Fees, Total Net
```
