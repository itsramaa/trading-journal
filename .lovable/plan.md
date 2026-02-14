

# Performance Page: Deep UX Analysis & Fixes

## Scope & Coverage (100%)

All files read in full:

**Page**: `src/pages/Performance.tsx` (278 lines)

**Sub-Components**: `PerformanceFilters.tsx` (131 lines), `PerformanceKeyMetrics.tsx` (197 lines), `PerformanceMonthlyTab.tsx` (110 lines), `PerformanceStrategiesTab.tsx` (162 lines), `PerformanceContextTab.tsx` (67 lines)

**Analytics Components**: `TradingBehaviorAnalytics.tsx` (297 lines), `SevenDayStatsCard.tsx` (127 lines), `EquityCurveWithEvents.tsx` (285 lines), `DrawdownChart.tsx` (134 lines), `TradingHeatmapChart.tsx` (348 lines), `SessionPerformanceChart.tsx` (246 lines), `CombinedContextualScore.tsx` (310 lines), `EventDayComparison.tsx` (239 lines), `FearGreedZoneChart.tsx` (215 lines), `VolatilityLevelChart.tsx` (246 lines)

**Hooks**: `use-contextual-analytics.ts` (413 lines), `use-monthly-pnl.ts` (147 lines), `use-strategy-performance.ts` (137 lines), `use-mode-filtered-trades`, `use-mode-visibility`, `use-binance-daily-pnl`

**Shared UI**: `AnalyticsLevelSelector.tsx` (151 lines), `FilterActiveIndicator.tsx` (122 lines)

**Calculations**: `src/lib/trading-calculations.ts` (335 lines)

---

## Issues Found

### 1. Contextual Analytics Not Filtered by Page Filters (Data Integrity)

`useContextualAnalytics()` always calls `useModeFilteredTrades()` internally and computes its own segmentation. It does NOT receive the page-level filtered trades. This means when a user applies date range, strategy, account, or exchange filters on the Performance page:

- **Overview tab**: `SessionPerformanceChart` shows unfiltered session data
- **Context tab**: `EventDayComparison`, `FearGreedZoneChart`, and `VolatilityLevelChart` all show unfiltered data

Only `CombinedContextualScore` and `TradingHeatmapChart` correctly receive `filteredTrades` from the parent.

**Impact**: User sees filtered Key Metrics and Equity Curve, but unfiltered Session and Context charts on the same page. This creates misleading mixed-filter analytics.

**Fix**: Refactor `useContextualAnalytics` to accept an optional `trades` parameter (same pattern as `SevenDayStatsCard` and `DrawdownChart`). When provided, use it instead of fetching internally. The Performance page already has `filteredTrades` -- pass it through.

### 2. Monthly Tab Not Filtered by Page Filters (Data Integrity)

`useMonthlyPnl()` calls `useModeFilteredTrades()` internally and ignores all page-level filters (date range, strategy, account, exchange). The Monthly tab always shows full-mode data regardless of what the user selected in the filter bar.

**Fix**: Refactor `useMonthlyPnl` to accept an optional `trades` parameter. When provided, compute monthly stats from that dataset instead of fetching its own.

### 3. TradingHeatmapChart Uses Wrong PnL Field (Calculation Standard Violation)

`TradingHeatmapChart.tsx` lines 93-94:
```typescript
const isWin = trade.result === 'win' || (trade.pnl && trade.pnl > 0);
const pnl = trade.pnl || 0;
```

The interface `TradeWithTime` only declares `pnl`, dropping `realized_pnl`. For Binance-synced trades, `realized_pnl` is the authoritative P&L value. The standardized calculation chain is `realized_pnl ?? pnl ?? 0`. This component uses the estimated `pnl` field instead, producing inaccurate heatmap data for synced trades.

**Fix**: Add `realized_pnl` to the `TradeWithTime` interface and use the standard fallback chain.

### 4. Hardcoded Tailwind Colors in CombinedContextualScore (UX Standard Violation)

`CombinedContextualScore.tsx` uses 11 instances of hardcoded Tailwind color classes (`text-green-500`, `text-red-500`, `text-emerald-400`, `text-orange-500`, `text-yellow-500`) instead of semantic tokens.

Per the UX Consistency Standard #2, financial win/loss indicators must use `text-profit` and `text-loss`. Non-financial zone indicators (Optimal, Favorable, etc.) should use chart tokens (`chart-1` through `chart-5`) for theme consistency.

**Fix**: Replace hardcoded colors with semantic chart tokens. Win rate comparisons (`>= 50%`) should use `text-profit`/`text-loss`. Zone indicators should use `hsl(var(--chart-N))` tokens.

### 5. No Issues Found (Verified Correct)

- **Tab URL persistence**: `activeTab` uses `useSearchParams` correctly
- **Mode-as-context parity**: Identical structure in Paper and Live -- correct
- **Data isolation**: `useModeFilteredTrades` + analytics level selector correctly filters base trades
- **Loading state**: Full-page `MetricsGridSkeleton` during load -- correct
- **Empty state**: `EmptyState` component when no trades -- correct
- **Error states**: React Query handles errors with retry -- correct
- **SevenDayStatsCard**: Accepts external trades prop, respects filters -- correct
- **DrawdownChart**: Accepts external trades prop, respects filters -- correct
- **EquityCurveWithEvents**: Receives pre-computed `equityData` from filtered trades -- correct
- **TradingBehaviorAnalytics**: Receives `filteredTrades` directly -- correct
- **PerformanceKeyMetrics**: Receives pre-computed `stats` from filtered trades -- correct
- **PerformanceStrategiesTab**: Inline `calculateStrategyPerformance` uses filtered trades -- correct
- **Analytics Level Selector**: Properly drives trade filtering with account/exchange/type scopes -- correct
- **FilterActiveIndicator**: Shows clear scope label with Clear button -- correct
- **Color tokens (other components)**: All other components use `text-profit`/`text-loss` correctly
- **ARIA**: Charts have `role="region"`, `role="img"`, proper `aria-label` -- correct
- **PnL standard (other components)**: All other components use `realized_pnl ?? pnl ?? 0` -- correct
- **Binance daily stats**: Today-only data, not filter-dependent by design -- correct

---

## Implementation Plan

### File 1: `src/hooks/analytics/use-contextual-analytics.ts`

**Accept optional trades parameter**: Change the hook signature to accept an optional pre-filtered trades array. When provided, use it instead of calling `useModeFilteredTrades()`:

```typescript
export function useContextualAnalytics(externalTrades?: TradeEntry[]): { ... } {
  const { data: internalTrades, isLoading } = useModeFilteredTrades();
  const trades = externalTrades ?? internalTrades;
  // ... rest of computation uses `trades`
}
```

This follows the same established pattern used by `SevenDayStatsCard`, `DrawdownChart`, and other components.

### File 2: `src/hooks/analytics/use-monthly-pnl.ts`

**Accept optional trades parameter**: Same pattern -- accept external trades:

```typescript
export function useMonthlyPnl(externalTrades?: TradeEntry[]): MonthlyPnlResult {
  const { data: rawTrades = [], isLoading } = useModeFilteredTrades();
  const trades = externalTrades ?? rawTrades;
  // ... rest uses `trades`
}
```

### File 3: `src/pages/Performance.tsx`

**Pass filtered trades to hooks**: Update the hook calls to pass `filteredTrades`:

```typescript
const { data: contextualData } = useContextualAnalytics(filteredTrades);
const monthlyStats = useMonthlyPnl(filteredTrades);
```

Note: Since hooks must be called unconditionally, and `filteredTrades` is derived from `useMemo`, this is safe. The hooks will recompute when `filteredTrades` changes.

### File 4: `src/components/analytics/charts/TradingHeatmapChart.tsx`

**Fix PnL calculation**: Update the `TradeWithTime` interface and usage:

```typescript
interface TradeWithTime {
  id: string;
  pnl: number | null;
  realized_pnl?: number | null;  // ADD
  result: string | null;
  entry_datetime?: string | null;
  trade_date: string;
}
```

Update P&L usage (lines 93-94, 99, 104, 111):
```typescript
const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
const isWin = trade.result === 'win' || pnl > 0;
```

### File 5: `src/components/analytics/contextual/CombinedContextualScore.tsx`

**Replace hardcoded colors with semantic tokens**: Replace all 11 instances:

Zone colors in metrics array and `getScoreColor`:
- `text-green-500` -> `text-profit` (for Optimal / Excellent)
- `text-emerald-400` -> `text-chart-2` (for Favorable / Good)
- `text-yellow-500` -> `text-chart-3` (for Moderate)
- `text-orange-500` -> `text-chart-4` (for Risky / Poor)
- `text-red-500` -> `text-loss` (for Extreme / Critical)

Win rate comparison (line 283):
- `text-green-500` -> `text-profit`
- `text-red-500` -> `text-loss`

Factor indicator icon (line 250):
- `text-yellow-500` -> `text-chart-3`

Best Zone insight (lines 300-301):
- `bg-green-500/10 border-green-500/30` -> `bg-profit/10 border-profit/30`
- `text-green-600` -> `text-profit`

---

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/analytics/use-contextual-analytics.ts` | Accept optional trades param for filter passthrough |
| `src/hooks/analytics/use-monthly-pnl.ts` | Accept optional trades param for filter passthrough |
| `src/pages/Performance.tsx` | Pass filteredTrades to contextual and monthly hooks |
| `src/components/analytics/charts/TradingHeatmapChart.tsx` | Fix PnL field to use `realized_pnl ?? pnl ?? 0` |
| `src/components/analytics/contextual/CombinedContextualScore.tsx` | Replace 11 hardcoded colors with semantic tokens |

Total: 5 files modified. Fixes cover 2 data integrity issues (filters not propagated), 1 calculation standard violation (wrong PnL field), and 1 UX standard violation (hardcoded colors).

