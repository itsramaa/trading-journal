
# Performance Page - Functional Correctness Audit

## Audit Scope

Reviewed: page (`Performance.tsx`), sub-components (`PerformanceKeyMetrics.tsx`, `PerformanceMonthlyTab.tsx`, `PerformanceContextTab.tsx`, `PerformanceStrategiesTab.tsx`, `PerformanceFilters.tsx`), analytics components (`DrawdownChart.tsx`, `EquityCurveWithEvents.tsx`, `TradingBehaviorAnalytics.tsx`, `SevenDayStatsCard.tsx`, `SessionPerformanceChart.tsx`, `TradingHeatmap.tsx`, `CryptoRanking.tsx`, `AIPatternInsights.tsx`), hooks (`use-monthly-pnl.ts`, `use-contextual-analytics.ts`, `use-strategy-performance.ts`, `use-mode-filtered-trades.ts`), utilities (`trading-calculations.ts`), and cross-domain dependencies.

---

## Issues Found

### 1. DrawdownChart Uses `||` Instead of `??` for PnL -- Breakeven Trades Silently Skipped (Accuracy - HIGH)

**File:** `src/components/analytics/charts/DrawdownChart.tsx` (line 37)

```typescript
const pnl = trade.realized_pnl || trade.pnl || 0;
```

The `||` operator treats `0` as falsy. If `realized_pnl` is exactly `0` (breakeven trade), it falls through to `trade.pnl`, which may contain a stale estimate value. This violates the project's standardized PnL calculation policy which mandates `realized_pnl ?? pnl ?? 0`.

The same bug exists in:
- `src/components/analytics/charts/TradingHeatmap.tsx` (line 93)
- `src/components/analytics/CryptoRanking.tsx` (line 48)
- `src/components/analytics/AIPatternInsights.tsx` (lines 40-42)
- `src/lib/export/heatmap-export.ts` (line 25)
- `src/pages/TradingHeatmap.tsx` (lines 98, 130, 156, 372-373)

**Fix:** Replace `||` with `??` in all affected files:
```typescript
const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
```

Total: 8 files, ~12 occurrences.

---

### 2. `text-warning` and `hsl(var(--warning))` Color Tokens Undefined in EquityCurveWithEvents (Clarity - HIGH)

**File:** `src/components/analytics/charts/EquityCurveWithEvents.tsx` (lines 161, 243, 257)

The component uses `text-warning` (CSS class) and `hsl(var(--warning))` (inline style) which are NOT defined in the project's CSS theme. The `warning` token does not exist (confirmed by searching all CSS files). This means:
- The tooltip "Event Day" label at line 161 is invisible/unstyled
- Event annotation dots at line 243 have no fill color (renders as black or transparent)
- Event legend icon at line 257 is invisible

The same issue exists in:
- `src/components/analytics/charts/TradingHeatmap.tsx` (lines 225-226, 252, 311)
- `src/components/analytics/contextual/EventDayComparison.tsx` (line 75)

**Fix:** Replace all `text-warning` with `text-[hsl(var(--chart-4))]` and `hsl(var(--warning))` with `hsl(var(--chart-4))` across these files, matching the project standard established in the Risk Overview fix.

---

### 3. Performance Page Missing Top-Level ErrorBoundary (Comprehensiveness - MEDIUM)

**File:** `src/pages/Performance.tsx`

No ErrorBoundary wraps the page. The page renders complex chart components (`EquityCurveWithEvents`, `DrawdownChart`, `TradingHeatmapChart`, `SessionPerformanceChart`) that process live data and can throw on unexpected shapes. The RiskManagement page was just fixed with this same pattern.

**Fix:** Add ErrorBoundary with `retryKey` pattern:
```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";

const [retryKey, setRetryKey] = useState(0);

<ErrorBoundary title="Performance Analytics" onRetry={() => setRetryKey(k => k + 1)}>
  <div key={retryKey} className="space-y-6">
    {/* existing content */}
  </div>
</ErrorBoundary>
```

---

## Verified Correct (No Issues)

The following were explicitly verified and found functionally sound:

- **PnL calculation in `trading-calculations.ts`**: Uses `getTradeNetPnl(t)` helper with `t.realized_pnl ?? t.pnl ?? 0` -- correct standard
- **Win rate formula**: `(wins / totalTrades) * 100` -- correct
- **Profit factor**: `grossProfit / grossLoss` with Infinity guard when `grossLoss === 0` -- correct
- **Expectancy**: `(winRate/100 * avgWin) - ((1 - winRate/100) * avgLoss)` -- correct
- **Max drawdown**: Peak-to-trough on sorted equity curve with percentage relative to peak -- correct
- **Sharpe ratio**: Annualized with `sqrt(252)` factor, 0% risk-free rate -- standard simplified approach
- **Largest win/loss**: Uses `Math.max/min` on `getTradeNetPnl` -- correct (uses `??` not `||`)
- **Strategy performance**: Contribution calculated as `strategyPnl / |totalPnl| * 100` -- correct, handles division by zero
- **Monthly P&L hook**: Uses `realized_pnl ?? pnl ?? 0` throughout -- correct standard
- **Monthly rolling 30-day**: Uses `eachDayOfInterval` with `subDays(now, 29)` for 30-day window -- correct
- **Monthly change calculation**: `(current - last) / |last| * 100` with zero guard -- correct
- **Contextual analytics**: Uses `realized_pnl ?? pnl ?? 0` throughout -- correct
- **Fear/Greed segmentation**: Threshold-based zones from centralized constants -- correct
- **Correlation calculation**: Pearson coefficient with minimum sample size guard -- correct
- **Session segmentation**: Uses centralized `getTradeSession` utility -- single source of truth
- **Mode isolation**: `useModeFilteredTrades` used for default data; `allTrades` only for `type` level -- correct separation
- **Analytics level selector**: Account/Exchange/Type/Overall filtering with proper trade scoping -- correct
- **Date range filtering**: Inclusive bounds check on `trade_date` -- correct
- **Strategy filtering**: Empty array returns all trades; otherwise filters by strategy ID membership -- correct
- **Event day filtering**: Checks `market_context.events.hasHighImpactToday` -- correct
- **Equity curve generation**: Sorted by trade_date, cumulative PnL with `getTradeNetPnl` -- correct
- **URL tab persistence**: `useSearchParams` for tab state -- correct
- **Loading states**: `MetricsGridSkeleton` shown during loading -- correct
- **Empty states**: `EmptyState` component when no trades -- correct
- **Semantic colors**: `text-profit` / `text-loss` used consistently in key metrics, monthly tab, strategies tab -- correct
- **Currency formatting**: `useCurrencyConversion` used in all monetary displays -- correct
- **ARIA**: Behavior analytics has `role="region"` with `aria-label`; 7-day stats has `role="group"`; DrawdownChart and EquityCurve have both `role="region"` and `role="img"` -- correct
- **InfoTooltips**: Present on all key metrics (Win Rate, Profit Factor, Expectancy, Max Drawdown, Sharpe, Avg R:R, Largest Gain/Loss) -- comprehensive
- **Filter propagation**: `filteredTrades` passed to `useContextualAnalytics`, `useMonthlyPnl`, all sub-components -- consistent
- **Strategy performance map**: Uses `useModeFilteredTrades` independently for AI quality scoring -- correct (mode-isolated)
- **TradingBehaviorAnalytics**: Uses `realized_pnl ?? pnl ?? 0` -- correct; handles empty states with null returns
- **SevenDayStatsCard**: Streak calculation from most recent trades -- correct logic
- **SessionPerformanceChart**: Minimum 3 trades per session for best/worst, 5 total for display -- appropriate guards

---

## Summary

| # | Files | Issue | Criteria | Severity |
|---|-------|-------|----------|----------|
| 1 | `DrawdownChart.tsx`, `TradingHeatmap.tsx`, `CryptoRanking.tsx`, `AIPatternInsights.tsx`, `heatmap-export.ts`, `TradingHeatmap.tsx` (page) | `\|\|` instead of `??` for PnL extraction -- breakeven trades use wrong value | Accuracy | High |
| 2 | `EquityCurveWithEvents.tsx`, `TradingHeatmap.tsx`, `EventDayComparison.tsx` | `text-warning` / `hsl(var(--warning))` undefined -- event indicators invisible | Clarity | High |
| 3 | `Performance.tsx` | Missing top-level ErrorBoundary | Comprehensiveness | Medium |

Total: ~10 files, 3 categories of fixes.

## Technical Details

### Fix 1: Replace `||` with `??` for PnL extraction (8 files, ~12 occurrences)

In each file, replace:
```typescript
trade.realized_pnl || trade.pnl || 0
```
With:
```typescript
trade.realized_pnl ?? trade.pnl ?? 0
```

Affected files and lines:
- `src/components/analytics/charts/DrawdownChart.tsx` line 37
- `src/components/analytics/charts/TradingHeatmap.tsx` line 93
- `src/components/analytics/CryptoRanking.tsx` line 48
- `src/components/analytics/AIPatternInsights.tsx` lines 40, 42
- `src/lib/export/heatmap-export.ts` line 25
- `src/pages/TradingHeatmap.tsx` lines 98, 130, 156, 372, 373

### Fix 2: Replace undefined `text-warning` / `hsl(var(--warning))` tokens (3 files)

**`src/components/analytics/charts/EquityCurveWithEvents.tsx`:**
- Line 161: `text-warning` to `text-[hsl(var(--chart-4))]`
- Line 243: `hsl(var(--warning))` to `hsl(var(--chart-4))`
- Line 257: `text-warning` to `text-[hsl(var(--chart-4))]`

**`src/components/analytics/charts/TradingHeatmap.tsx`:**
- Line 225: `bg-warning` to `bg-[hsl(var(--chart-4))]`
- Line 226: `text-warning-foreground` to `text-background`
- Line 252: `text-warning bg-warning/10` to `text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10`
- Line 310: `ring-warning` to `ring-[hsl(var(--chart-4))]`
- Line 311: `text-warning` to `text-[hsl(var(--chart-4))]`

**`src/components/analytics/contextual/EventDayComparison.tsx`:**
- Line 75: `text-warning` to `text-[hsl(var(--chart-4))]`

### Fix 3: Add ErrorBoundary to Performance page

Import `ErrorBoundary` from `@/components/ui/error-boundary`. Add `retryKey` state. Wrap the main content with `ErrorBoundary` using the standard retry pattern.
