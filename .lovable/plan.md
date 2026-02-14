

# Performance Page: Deep UX Analysis & Fixes

## Issues Found

### 1. Uncontrolled Tabs -- No URL Persistence

`Performance.tsx` line 185 uses `defaultValue="overview"`. This means:
- Tab state not reflected in URL
- Deep links like `/performance?tab=monthly` don't work
- Navigating away and back resets to Overview
- Inconsistent with the controlled tab pattern now established on Risk, Import, and TradingJournal pages

**Fix**: Replace with controlled `Tabs` using `useSearchParams`, identical pattern to other pages.

### 2. Binance Stats Shown in Paper Mode Without Guard

`PerformanceKeyMetrics` renders Binance daily P&L breakdown (lines 169-188) based solely on `binanceStats.isConnected && binanceStats.grossPnl !== 0`. There is no mode check. In Paper mode, if the user has Binance connected, Live Binance data bleeds into the Paper performance view, violating data isolation.

**Fix**: Pass `showExchangeData` from `useModeVisibility` to `PerformanceKeyMetrics` and guard the Binance stats section with it. Only show the Binance breakdown in Live mode.

### 3. SevenDayStatsCard Ignores Analytics Scope Filters

`SevenDayStatsCard` calls its own `useModeFilteredTrades()` internally (line 13). This means it always shows mode-level data and ignores the page-level filters (date range, strategy, analytics level scope). When a user filters to "Account: Binance Main", the 7-Day Stats still shows data from all accounts.

**Fix**: Refactor `SevenDayStatsCard` to accept `trades` as a prop (same pattern as `TradingBehaviorAnalytics`). Pass the `filteredTrades` from the parent `Performance.tsx` so it respects all active filters.

### 4. DrawdownChart Ignores Analytics Scope Filters

Same issue as SevenDayStatsCard. `DrawdownChart` calls `useModeFilteredTrades()` internally (line 12). It ignores date range, strategy, and analytics level filters set on the Performance page.

**Fix**: Refactor `DrawdownChart` to accept `trades` as a prop instead of fetching its own data. Pass `filteredTrades` from the parent.

### 5. Session Performance Conditionally Hidden Instead of Empty State

Lines 216-224: The entire Session Performance section is wrapped in `{contextualData?.bySession && (...)}`. If contextual data hasn't loaded or has no session data, the section silently disappears from the layout. Other sections (like Equity Curve, Drawdown) always render with appropriate empty states.

**Fix**: Always render the Session Performance section wrapper. Show a loading skeleton or "No session data available" empty state when `contextualData?.bySession` is falsy, consistent with how DrawdownChart and EquityCurve handle empty states.

### 6. Strategy Comparison Chart Uses `hsl(var(--destructive))` Instead of Semantic Token

`PerformanceStrategiesTab.tsx` line 148 uses `hsl(var(--destructive))` for negative P&L bars. Per semantic color standards, financial losses should use `hsl(var(--loss))` / `text-loss`.

**Fix**: Replace `hsl(var(--destructive))` with `hsl(var(--loss))` in the strategy comparison chart Cell fill.

### 7. Profit Factor Always Shows `text-profit` Color

`PerformanceKeyMetrics.tsx` line 66: Profit Factor value always uses `text-profit` regardless of actual value. A profit factor below 1.0 means losing money, which should use `text-loss`.

**Fix**: Apply conditional coloring based on value:
- >= 1.5: `text-profit`
- >= 1.0: `text-foreground`
- < 1.0: `text-loss`

---

## Implementation Plan

### File: `src/pages/Performance.tsx`
1. Import `useSearchParams` from `react-router-dom`
2. Import `useModeVisibility` from hooks
3. Replace `defaultValue="overview"` with controlled `value` + `onValueChange` via `useSearchParams`
4. Pass `showExchangeData` to `PerformanceKeyMetrics` as prop
5. Pass `filteredTrades` to `SevenDayStatsCard` as prop
6. Pass `filteredTrades` to `DrawdownChart` as prop
7. Always render Session Performance section with fallback empty state

### File: `src/components/performance/PerformanceKeyMetrics.tsx`
1. Add `showExchangeData` to props interface
2. Guard Binance stats section with `showExchangeData`
3. Fix Profit Factor color: conditional based on value (>= 1.5 profit, >= 1.0 foreground, < 1.0 loss)

### File: `src/components/analytics/SevenDayStatsCard.tsx`
1. Add optional `trades` prop to accept external trade data
2. Remove internal `useModeFilteredTrades()` call when `trades` prop is provided
3. Maintain backward compatibility: if no prop, keep internal fetch

### File: `src/components/analytics/charts/DrawdownChart.tsx`
1. Add optional `trades` prop to accept external trade data
2. Remove internal `useModeFilteredTrades()` call when `trades` prop is provided
3. Maintain backward compatibility

### File: `src/components/performance/PerformanceStrategiesTab.tsx`
1. Replace `hsl(var(--destructive))` with `hsl(var(--loss))` in Cell fill

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Performance.tsx` | Controlled tabs via useSearchParams; pass showExchangeData, filteredTrades to children; session section always renders |
| `src/components/performance/PerformanceKeyMetrics.tsx` | Guard Binance stats with showExchangeData; fix Profit Factor color logic |
| `src/components/analytics/SevenDayStatsCard.tsx` | Accept optional trades prop; respect parent filters |
| `src/components/analytics/charts/DrawdownChart.tsx` | Accept optional trades prop; respect parent filters |
| `src/components/performance/PerformanceStrategiesTab.tsx` | Semantic color token for loss bars |

