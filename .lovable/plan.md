

# AI Insights: Variance Awareness, Risk-Adjusted Rankings & Data Integrity

Addresses 5 remaining statistical gaps: variance metrics, expectancy-based pair ranking, drawdown context for streak insights, correlation data gating, and prediction confidence tightening.

---

## 1. Add Variance Metrics to Stats (Std Dev, Rolling Performance)

**File:** `src/pages/AIInsights.tsx`

Extend the `stats` useMemo to calculate:

```typescript
// Standard deviation of per-trade returns
const pnls = closedTrades.map(t => getPnl(t));
const meanPnl = totalPnl / closedTrades.length;
const stdDev = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - meanPnl, 2), 0) / pnls.length);

// Rolling 30-trade performance (last 30 closed trades)
const last30 = sortedTrades.slice(0, Math.min(30, sortedTrades.length));
const last30Pnl = last30.reduce((s, t) => s + getPnl(t), 0);
const last30WinRate = last30.filter(t => getPnl(t) > 0).length / last30.length * 100;
```

Add these to the returned stats object: `stdDev`, `last30Pnl`, `last30WinRate`.

**New insight card** in the insights array:

- If `stdDev` is large relative to `avgWin` (stdDev > avgWin * 1.5), generate a neutral insight:
  - Title: "High Return Variance"
  - Description: `"Your per-trade P&L std dev (${formatPnl(stdDev)}) is high relative to avg win (${formatPnl(avgWin)}). Short-term results may not reflect true edge — evaluate over 100+ trades."`
  - Confidence: based on total trade count

- Rolling 30 vs overall comparison insight:
  - If `last30WinRate` differs from overall `winRate` by more than 10 percentage points, add a pattern insight indicating improving or declining recent performance.

---

## 2. Pair Ranking: Sort by Expectancy, Not Raw P&L

**File:** `src/pages/AIInsights.tsx`

Currently pairs are sorted by `b.pnl - a.pnl` (line 146). This biases toward high-volume or lucky small-sample pairs.

Change to expectancy-based ranking:

```typescript
const pairRankings = Object.entries(pairStats)
  .map(([pair, s]) => ({
    pair,
    ...s,
    winRate: (s.wins / (s.wins + s.losses)) * 100,
    trades: s.wins + s.losses,
    expectancy: s.pnl / (s.wins + s.losses),  // avg P&L per trade
  }))
  .filter(p => p.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING)
  .sort((a, b) => b.expectancy - a.expectancy);
```

Update the Pair Performance Ranking UI to show expectancy alongside total P&L:

```typescript
<p className="text-sm text-muted-foreground">
  {pair.trades} trades • {pair.winRate.toFixed(0)}% WR • {formatPnl(pair.expectancy)}/trade
</p>
```

Update best/worst pair insight descriptions to reference expectancy instead of total P&L.

---

## 3. Drawdown Context for Streak Insights

**File:** `src/pages/AIInsights.tsx`

Import and use `calculateAdvancedRiskMetrics` from `src/lib/advanced-risk-metrics.ts` to add drawdown context to streak insights.

```typescript
import { calculateAdvancedRiskMetrics } from "@/lib/advanced-risk-metrics";
```

In the stats useMemo, compute:

```typescript
const riskMetrics = calculateAdvancedRiskMetrics(
  closedTrades.map(t => ({
    pnl: getPnl(t),
    trade_date: t.trade_date,
    result: t.result || '',
  }))
);
```

Expose `maxDrawdownPercent` and `currentDrawdownPercent` in stats.

Update the losing streak insight description:

```typescript
description: `Statistically rare streak. Current drawdown: ${stats.currentDrawdownPercent.toFixed(1)}% from peak (max historical: ${stats.maxDrawdownPercent.toFixed(1)}%). Review recent trade quality and setup adherence.`,
```

This grounds the streak warning in concrete equity context rather than emotional assumption.

---

## 4. Correlation Section: Gate by Data Availability

**File:** `src/components/analytics/contextual/ContextualPerformance.tsx`

The `CorrelationRow` currently shows `0.00 Weak None` when there's no market context data. This is misleading because 0 means "no data," not "no relationship."

Update the CorrelationRow component to check `tradesWithContext`:

```typescript
function CorrelationRow({ label, value, description, hasData }: { 
  label: string; value: number; description: string; hasData: boolean;
}) {
  if (!hasData) {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Insufficient data</p>
        </div>
      </div>
    );
  }
  // ... existing render logic
}
```

Pass `hasData={data.tradesWithContext >= DATA_QUALITY.MIN_TRADES_FOR_CORRELATION}` to each CorrelationRow.

Additionally, if ALL correlations lack data, collapse the entire Correlations card into a single message rather than showing 3 "Insufficient data" rows.

---

## 5. Prediction Confidence: Penalize Imbalanced Distributions

**File:** `src/lib/predictive-analytics.ts`

Current confidence is purely sample-count based. A 25-sample prediction with 24/25 continuations (96%) gets "low" confidence, but it might be from a single cluster period.

Add a distribution quality check to `calculateStreakProbability`:

```typescript
// After computing occurrences and continuations:
const continuationRate = continuations / occurrences;

// Penalize extreme imbalance: if rate > 90% or < 10%, 
// the pattern may be clustering, not a true edge
const isImbalanced = continuationRate > 0.9 || continuationRate < 0.1;

// Downgrade confidence by one level if imbalanced AND sample is not large
function getAdjustedConfidence(n: number, imbalanced: boolean): Confidence {
  const base = getConfidence(n);
  if (imbalanced && base !== 'low') {
    return base === 'high' ? 'medium' : 'low';
  }
  return base;
}
```

Update the description to include a caveat when imbalanced:

```typescript
description: `After ${currentStreak} consecutive ${streakType}s, historically ${prob.toFixed(0)}% of similar streaks continued. Based on ${occurrences} pattern matches.${isImbalanced ? ' Note: distribution is heavily skewed — interpret with caution.' : ''}`,
confidence: getAdjustedConfidence(occurrences, isImbalanced),
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/AIInsights.tsx` | Add stdDev/rolling30 to stats; expectancy-based pair sort; drawdown context via advanced-risk-metrics; variance insight card |
| `src/components/analytics/contextual/ContextualPerformance.tsx` | Gate CorrelationRow with `hasData` prop; show "Insufficient data" instead of 0.00 |
| `src/lib/predictive-analytics.ts` | Add imbalance penalty to confidence; append skew caveat to description |

## What Does NOT Change

- `src/lib/advanced-risk-metrics.ts` (already has all needed calculations)
- `src/lib/constants/ai-analytics.ts` (thresholds sufficient)
- Session Insights component (already addressed in previous iteration)
- Contextual insight generation logic in `use-contextual-analytics.ts`
- Any backend or database logic

