

# Performance Page: Metric Integrity & Information Hierarchy Fix

Four targeted fixes addressing calculation inconsistency, misleading empty metrics, missing narrative, and cognitive overload.

---

## Problem Summary

1. **Max Drawdown mismatch**: Key Metrics shows 108.40% while Drawdown Chart shows -100.00%. Root cause: `calculateTradingStats()` divides by `peak` (cumulative PnL) instead of `initialBalance + peak` (total equity at peak). Without initial balance, small accounts get impossible percentages.
2. **Avg R:R = 0.00:1**: `calculateRR()` returns 0 when `stop_loss` is null. Displaying "0.00:1" implies zero edge; it actually means "not enough data to calculate."
3. **Best Day negative**: Technically correct (no profit day in 7D window), but "Best Day: -$0.98" with a Trophy icon sends contradictory signals.
4. **No narrative**: 20+ metrics displayed flat, no hierarchy, no verdict. User must self-interpret.

---

## Changes

### 1. Fix Max Drawdown Calculation (Critical)

**File:** `src/lib/trading-calculations.ts`

The `calculateTradingStats` function currently computes drawdown as:

```
maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0
```

This divides by cumulative PnL peak only, ignoring initial capital. For a $47 wallet with $5 cumulative peak, a $6 drawdown becomes 120%.

Fix: Add optional `initialBalance` parameter and use the standardized formula (matching `DrawdownChart` and the project's drawdown-calculation-standard memory):

```
drawdownBase = initialBalance + peak
maxDrawdownPercent = drawdownBase > 0 ? (maxDrawdown / drawdownBase) * 100 : 0
```

Cap at 100%.

**File:** `src/pages/Performance.tsx`

Pass the user's initial balance (from account data or a sensible default) to `calculateTradingStats()`.

### 2. Guard Invalid Metrics Display

**File:** `src/components/performance/PerformanceKeyMetrics.tsx`

| Metric | Current | Fix |
|--------|---------|-----|
| Avg R:R | Shows "0.00:1" when no SL data | Show "N/A" with tooltip "Set stop loss on trades to calculate R:R" |
| Sharpe Ratio | Shows value even with < 30 trades | Show value but add "(low sample)" subtitle when totalTrades < 30 |
| Max Drawdown | Shows raw number | Already fixed by calculation fix above |

The R:R card checks `stats.avgRR === 0 && stats.totalTrades > 0` to distinguish "no data" from "actual zero."

### 3. Fix 7-Day Best/Worst Day Framing

**File:** `src/components/analytics/SevenDayStatsCard.tsx`

When `bestDay.pnl < 0`:
- Change label from "Best Day" to "Least Loss Day"
- Change icon from Trophy (gold, implies achievement) to a neutral Activity icon

When `worstDay.pnl > 0`:
- Change label from "Worst Day" to "Smallest Gain Day"

This ensures the framing matches the data's actual meaning.

### 4. Add Performance Summary Card

**File:** New component `src/components/performance/PerformanceSummaryCard.tsx`

A single card at the top of the Overview tab (above 7-Day Stats) that provides a quick verdict:

```
+------------------------------------------------------------------+
| Performance Summary                               115 trades     |
|                                                                  |
| Net P&L: +$3.33          Win Rate: 26.1%                        |
| Expectancy: $0.02/trade  Profit Factor: 1.04                    |
|                                                                  |
| Verdict: Borderline break-even. Low win rate offset by           |
|          favorable R:R on winners. Drawdown risk elevated.       |
+------------------------------------------------------------------+
```

The verdict is generated deterministically (not AI) using a simple rule engine:

| Condition | Label |
|-----------|-------|
| expectancy > avgPnl * 0.5 AND winRate > 50 | "Consistently profitable" |
| totalPnl > 0 AND winRate < 40 | "Profitable but inconsistent. Gains driven by large winners." |
| totalPnl > 0 AND expectancy < 0.1 | "Borderline break-even. Edge is thin." |
| totalPnl < 0 | "Currently unprofitable. Review risk and strategy." |
| maxDrawdownPercent > 30 | Append "Drawdown risk elevated." |

This provides the "story headline" the page currently lacks.

### 5. Hide Empty Context Sections

**File:** `src/components/performance/PerformanceContextTab.tsx`

Currently renders "0 trades analyzed" sections. Fix:
- `CombinedContextualScore`: Only render if `filteredTrades` has at least 1 trade with `market_context` data.
- `EventDayComparison`: Only render if either `eventDay` or `normalDay` has `totalTrades > 0`.
- `VolatilityLevelChart`: Only render if `byVolatility` has entries with data.

When the entire Context tab has zero renderable sections, show a single empty state: "Complete trades with market context enabled to see environmental analysis."

---

## Technical Details

### Drawdown Fix in `calculateTradingStats`

```typescript
export function calculateTradingStats(
  trades: TradeEntry[],
  initialBalance: number = 0  // NEW optional param
): TradingStats {
  // ... existing code ...

  // Max drawdown calculation (equity curve based)
  // ... existing peak/drawdown loop ...

  const drawdownBase = initialBalance + peak;
  const maxDrawdownPercent = drawdownBase > 0
    ? Math.min((maxDrawdown / drawdownBase) * 100, 100)
    : 0;

  // ... rest unchanged ...
}
```

### Summary Verdict Engine

```typescript
function generateVerdict(stats: TradingStats): string {
  const parts: string[] = [];
  
  if (stats.totalPnl < 0) {
    parts.push("Currently unprofitable. Review risk controls and strategy adherence.");
  } else if (stats.expectancy < 0.1 && stats.totalPnl > 0) {
    parts.push("Borderline break-even. Edge is thin.");
  } else if (stats.winRate < 40 && stats.totalPnl > 0) {
    parts.push("Profitable but inconsistent. Gains driven by large winners.");
  } else if (stats.winRate >= 50 && stats.profitFactor >= 1.5) {
    parts.push("Consistently profitable with solid edge.");
  } else {
    parts.push("Moderately profitable.");
  }
  
  if (stats.maxDrawdownPercent > 30) {
    parts.push("Drawdown risk elevated relative to returns.");
  }
  
  return parts.join(" ");
}
```

### R:R Display Guard

```typescript
// In PerformanceKeyMetrics
<CardContent>
  <div className="text-xl font-bold">
    {stats.avgRR === 0 && stats.totalTrades > 0
      ? <span className="text-muted-foreground">N/A</span>
      : formatRatio(stats.avgRR)
    }
  </div>
  {stats.avgRR === 0 && stats.totalTrades > 0 && (
    <p className="text-xs text-muted-foreground">Set stop loss to calculate</p>
  )}
</CardContent>
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/trading-calculations.ts` | Add `initialBalance` param to `calculateTradingStats`; fix drawdown % formula |
| `src/pages/Performance.tsx` | Pass initialBalance to stats calculation; add SummaryCard to overview |
| `src/components/performance/PerformanceKeyMetrics.tsx` | Guard R:R and Sharpe display for insufficient data |
| `src/components/analytics/SevenDayStatsCard.tsx` | Fix Best/Worst Day label when value contradicts framing |
| `src/components/performance/PerformanceContextTab.tsx` | Hide sections with zero analyzable data |
| `src/components/performance/PerformanceSummaryCard.tsx` | New: deterministic verdict card |

---

## What Changes

| Before | After |
|--------|-------|
| Max Drawdown 108.40% (impossible) | Capped, uses equity base (initialBalance + peak) |
| Avg R:R "0.00:1" (misleading) | "N/A" with explanation when no SL data |
| Best Day -$0.98 with Trophy icon | "Least Loss Day" with neutral icon |
| No narrative, 20+ flat metrics | Summary card with deterministic verdict at top |
| Empty context sections rendered | Hidden when no data; single empty state fallback |

