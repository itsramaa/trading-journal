
# Daily P&L & Trading Heatmap: Data Integrity & UX Fixes

Targeted fixes for misleading metrics, undefined-as-zero display, and missing context across both pages.

---

## Daily P&L Page Fixes

### 1. Fix "+100% vs last week" When Baseline is Zero

**File:** `src/hooks/analytics/use-unified-week-comparison.ts`

The current logic at line 121 returns `100` when `previousWeek.netPnl === 0` and current week has activity. This creates a misleading "+100%" display.

Fix: Return a sentinel value (e.g., `null`) instead of `100` when baseline is zero.

```typescript
// Change type of pnlPercent and tradesPercent to number | null
pnlPercent: number | null;
tradesPercent: number | null;
```

Calculation change:
```typescript
const pnlPercentChange = previousWeek.netPnl !== 0
  ? ((currentWeek.netPnl - previousWeek.netPnl) / Math.abs(previousWeek.netPnl)) * 100
  : null;  // was: currentWeek.netPnl !== 0 ? 100 : 0

const tradesPercentChange = previousWeek.trades !== 0
  ? ((currentWeek.trades - previousWeek.trades) / previousWeek.trades) * 100
  : null;  // was: currentWeek.trades !== 0 ? 100 : 0
```

**File:** `src/pages/DailyPnL.tsx`

Update `ChangeIndicator` to handle `null`:

```typescript
const ChangeIndicator = ({ value, suffix = '' }: { value: number | null; suffix?: string }) => {
  if (value === null) return <span className="text-muted-foreground text-xs">New activity</span>;
  // ... existing logic
};
```

### 2. Fix "Win Rate 0%" When 0 Trades Today

**File:** `src/pages/DailyPnL.tsx`

Line 132 currently shows `0%` when no trades exist today. Change to show a dash with context:

```typescript
<div>
  <p className="text-sm text-muted-foreground">Win Rate</p>
  {dailyStats.totalTrades === 0 ? (
    <>
      <p className="text-2xl font-bold text-muted-foreground">--</p>
      <p className="text-xs text-muted-foreground">No trades today</p>
    </>
  ) : (
    <p className="text-2xl font-bold">{dailyStats.winRate.toFixed(0)}%</p>
  )}
</div>
```

### 3. Add Tooltip to Best/Worst Trade Cards

**File:** `src/pages/DailyPnL.tsx`

Add an `InfoTooltip` to Best Trade and Worst Trade card titles (lines 209, 229):

```typescript
<CardTitle className="text-lg flex items-center gap-2">
  <TrendingUp className="h-5 w-5 text-profit" />
  Best Trade (7 Days)
  <InfoTooltip content="Based on realized P&L of closed trades in the last 7 days." />
</CardTitle>
```

Same pattern for Worst Trade.

### 4. Fix Symbol Breakdown Showing P&L with 0 Trades

**File:** `src/hooks/analytics/use-symbol-breakdown.ts`

The Binance path (line 123-134) counts trades from `data.count` which tracks REALIZED_PNL income records. But `net` includes commission rebates and funding, which can exist without a REALIZED_PNL entry.

Fix: Filter out symbols with zero trade count from the output:

```typescript
.filter(([symbol, data]) => symbol !== 'N/A' && data.count > 0)
```

This ensures no symbol appears with "0 trades" but non-zero P&L.

---

## Trading Heatmap Page Fixes

### 5. Low Sample Size Indicator on Session Cards

**File:** `src/pages/TradingHeatmap.tsx`

Add a "Low sample" badge when a session has fewer than 10 trades (line 274):

```typescript
<p className="text-sm text-muted-foreground">
  {s.trades} trades {'\u2022'} {formatWinRate(s.winRate)} win rate
  {s.trades > 0 && s.trades < 10 && (
    <span className="text-xs opacity-60 ml-1">(low sample)</span>
  )}
</p>
```

### 6. Fix Best/Worst Hour Identical & Negative Framing

**File:** `src/pages/TradingHeatmap.tsx`

When best and worst are the same hour, or when "Best Hour" has negative P&L, rename labels dynamically (lines 288-329):

```typescript
// Determine labels
const bestLabel = hourlyStats.best
  ? (hourlyStats.best.pnl < 0 ? 'Least Loss Hour' : 'Best Hour')
  : 'Best Hour';
const worstLabel = hourlyStats.worst
  ? (hourlyStats.worst.pnl > 0 ? 'Smallest Gain Hour' : 'Worst Hour')
  : 'Worst Hour';

// If best === worst (same hour), only show one
const showWorst = !hourlyStats.best || !hourlyStats.worst
  || hourlyStats.best.hour !== hourlyStats.worst.hour;
```

If `showWorst` is false, the Worst Hour card shows "Same as best" instead of duplicating identical data.

### 7. Fix Longest Win Streak "0 trades"

**File:** `src/pages/TradingHeatmap.tsx`

Line 340 shows "0 trades" when no wins exist. Change:

```typescript
<CardContent>
  {streakData.longestWin === 0 ? (
    <>
      <div className="text-lg font-bold text-muted-foreground">--</div>
      <p className="text-sm text-muted-foreground">No winning trades in selected period</p>
    </>
  ) : (
    <>
      <div className="text-lg font-bold">{streakData.longestWin} trades</div>
      <p className="text-sm text-muted-foreground">
        Current: {streakData.currentStreak > 0 ? `${streakData.currentStreak} wins` : 'N/A'}
      </p>
    </>
  )}
</CardContent>
```

Same pattern for Longest Loss Streak when `longestLoss === 0`.

### 8. Add Sample Size Context to Summary Footer

**File:** `src/pages/TradingHeatmap.tsx`

Enhance the existing footer (lines 365-376) with a sample size warning when trades are fewer than 20:

```typescript
<div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
  <span>
    Showing {filteredTrades.length} closed trades
    {selectedPair !== 'all' && ` for ${selectedPair}`}
    {dateRange !== 'all' && ` in last ${dateRange.replace('d', ' days')}`}
    {filteredTrades.length < 20 && filteredTrades.length > 0 && (
      <span className="ml-1 opacity-60">-- Sample size is limited</span>
    )}
  </span>
  {/* ... Total P&L stays same */}
</div>
```

### 9. Session Overlap: Already Correct

The `getSessionForTime()` in `session-utils.ts` assigns each trade to exactly one session using a priority waterfall (Sydney first, then Tokyo, London, NY). The `getTradeSession()` function used in the heatmap page also returns a single session per trade. No double-counting occurs. No change needed.

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/analytics/use-unified-week-comparison.ts` | `pnlPercent` and `tradesPercent` become `number \| null`; return `null` when baseline is zero |
| `src/pages/DailyPnL.tsx` | Handle null in ChangeIndicator; show "--" for 0-trade win rate; add tooltips to Best/Worst trade |
| `src/hooks/analytics/use-symbol-breakdown.ts` | Filter out symbols with `count === 0` from Binance breakdown |
| `src/pages/TradingHeatmap.tsx` | Low sample badge on sessions; adaptive Best/Worst Hour labels; fix 0-streak display; sample size footer warning |

## What Does NOT Change

- Session assignment logic (already single-session, no overlap double-counting)
- Weekly P&L trend chart data/logic
- Heatmap grid component (`TradingHeatmap.tsx`)
- Any backend/hook calculation logic beyond the two specified fixes
