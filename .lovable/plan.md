
# Implementation Plan: Multi-Domain Decimal Standardization & UI Polish

## Status Saat Ini

Semua phase dari plan sebelumnya telah **SELESAI**:

| Feature | Status |
|---------|--------|
| Fee Display Fix | Done - TradeHistoryCard dengan "See Summary" fallback |
| Decimal Standardization | Done - formatters.ts dengan smart decimals |
| Auto-Sync Fee Enrichment | Done - enrichWithFees() matching COMMISSION records |
| Applied to Key Components | Done - PortfolioOverviewCard, PositionSizeCalculator, DailyLossTracker |
| Notification Triggers | Done - notification-service.ts + use-notification-triggers.ts |
| Weekly Report Generator | Done - Edge function + PDF export hook |
| Notifications Page UI | Done - Export buttons + loading states |

---

## Next Priority: Extend Decimal Standardization to Remaining Domains

Berdasarkan user request untuk konsistensi decimals di **SEMUA DOMAIN**, beberapa komponen masih perlu di-update.

### Target Components

#### 1. Risk Domain

| File | Issue | Fix |
|------|-------|-----|
| `RiskProfileSummaryCard.tsx` | Uses raw `riskProfile.risk_per_trade_percent` tanpa formatting | Use `formatPercentUnsigned()` untuk consistency |
| `RiskSummaryCard.tsx` | May have inconsistent percent display | Audit & apply standard formatters |

#### 2. Strategy Domain

| File | Issue | Fix |
|------|-------|-----|
| `StrategyCard.tsx` | `(performance.winRate * 100).toFixed(1)%` dan `.toFixed(0)%` | Use `formatWinRate()` |
| `StrategyStats.tsx` | Various `.toFixed()` calls | Standardize to `formatPercent`, `formatWinRate` |
| `BacktestResults.tsx` | Likely has metrics with inconsistent decimals | Audit & apply formatters |

#### 3. Analytics Domain

| File | Issue | Fix |
|------|-------|-----|
| `SevenDayStatsCard.tsx` | Percent and currency displays | Apply formatters |
| `CryptoRanking.tsx` | Price/percent changes | Apply `formatPercent`, `formatPrice` |
| `TradeSummaryStats.tsx` | Win rate, profit factor display | Apply `formatWinRate`, `formatNumber` |

#### 4. Dashboard Domain (Remaining)

| File | Issue | Fix |
|------|-------|-----|
| `TodayPerformance.tsx` | Streak stats, percentages | Audit & apply formatters |
| `SystemStatusIndicator.tsx` | Status values | Audit decimals |

---

## Implementation Details

### Phase 1: Risk Domain Cleanup

**Files to Modify:**
- `src/components/risk/RiskProfileSummaryCard.tsx`
- `src/components/risk/RiskSummaryCard.tsx`

**Changes:**
```typescript
// RiskProfileSummaryCard.tsx
import { formatPercentUnsigned } from "@/lib/formatters";

// Replace:
<p className="text-lg font-semibold">{riskProfile.risk_per_trade_percent}%</p>

// With:
<p className="text-lg font-semibold">{formatPercentUnsigned(riskProfile.risk_per_trade_percent)}</p>
```

### Phase 2: Strategy Domain Cleanup

**Files to Modify:**
- `src/components/strategy/StrategyCard.tsx`
- `src/components/strategy/StrategyStats.tsx`
- `src/components/strategy/BacktestResults.tsx`

**Changes:**
```typescript
// StrategyCard.tsx
import { formatWinRate, formatNumber } from "@/lib/formatters";

// Replace:
<p>Win Rate: {(performance.winRate * 100).toFixed(1)}%</p>

// With:
<p>Win Rate: {formatWinRate(performance.winRate * 100)}</p>

// Replace:
{(performance.winRate * 100).toFixed(0)}% WR

// With:
{formatWinRate(performance.winRate * 100).replace('%', '')}% WR
```

### Phase 3: Analytics Domain Cleanup

**Files to Modify:**
- `src/components/analytics/SevenDayStatsCard.tsx`
- `src/components/analytics/CryptoRanking.tsx`
- `src/components/journal/TradeSummaryStats.tsx`

**Changes:**
```typescript
// Apply standard formatters throughout
import { formatPercent, formatCurrency, formatWinRate, formatNumber } from "@/lib/formatters";
```

### Phase 4: Dashboard Remaining Cleanup

**Files to Modify:**
- `src/components/dashboard/TodayPerformance.tsx`
- `src/components/dashboard/SystemStatusIndicator.tsx`

---

## Execution Order

1. **Phase 1**: Risk Domain - RiskProfileSummaryCard, RiskSummaryCard
2. **Phase 2**: Strategy Domain - StrategyCard, StrategyStats, BacktestResults
3. **Phase 3**: Analytics Domain - SevenDayStatsCard, CryptoRanking, TradeSummaryStats
4. **Phase 4**: Dashboard cleanup - TodayPerformance, SystemStatusIndicator

---

## Success Criteria

| Metric | Target |
|--------|--------|
| All percentages | Fixed 2 decimals (e.g., `65.50%`) |
| Win rates | Fixed 1 decimal (e.g., `65.5%`) |
| Currency/Numbers | Max 4 decimals, smart removal of trailing zeros |
| Consistency | All domains use centralized formatters |

---

## Technical Notes

### Formatter Usage Guide

| Format Type | Function | Example Input | Example Output |
|-------------|----------|---------------|----------------|
| P&L Change | `formatPercent(value)` | 5.5 | `+5.50%` |
| Win Rate | `formatWinRate(value)` | 65.5 | `65.5%` |
| Currency | `formatCurrency(value)` | 1234.56 | `$1,234.56` |
| Fee | `formatFee(value, asset)` | 0.0156 | `0.0156 USDT` |
| Ratio | `formatRatio(value)` | 2.5 | `2.50:1` |
| Number (generic) | `formatNumber(value)` | 0.00123 | `0.0012` |
| Unsigned % | `formatPercentUnsigned(value)` | 2.5 | `2.50%` |

---

## File Impact Summary

| Priority | File | Domain | Changes |
|----------|------|--------|---------|
| High | `RiskProfileSummaryCard.tsx` | Risk | Percent formatting |
| High | `StrategyCard.tsx` | Strategy | Win rate, profit factor |
| High | `SevenDayStatsCard.tsx` | Analytics | Stats formatting |
| Medium | `RiskSummaryCard.tsx` | Risk | Percent formatting |
| Medium | `StrategyStats.tsx` | Strategy | Multiple metrics |
| Medium | `BacktestResults.tsx` | Strategy | Backtest metrics |
| Medium | `CryptoRanking.tsx` | Analytics | Price/percent changes |
| Medium | `TradeSummaryStats.tsx` | Journal | Summary stats |
| Low | `TodayPerformance.tsx` | Dashboard | Stats formatting |
| Low | `SystemStatusIndicator.tsx` | Dashboard | Status values |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing displays | Incremental changes, test each component |
| Formatter output differences | Use parseFloat for consistency |
| Missing edge cases | Handle null/undefined values |

