

# Backtest Engine & Results: Statistical Integrity Fixes

Addresses 6 issues: engine position sizing, leverage warning, expectancy safety, trade density, fee breakdown, and exposure metric.

---

## 1. Engine: Use Config Risk Per Trade, Compounding, and Leverage

**Problem:** The edge function hardcodes `balance * 0.02` for risk amount (line 318) and ignores `config.riskPerTrade`, `config.compounding`, and `config.leverage`.

**File:** `supabase/functions/backtest-strategy/index.ts`

In the `runBacktest` function, replace the position sizing block (around line 318):

```typescript
// BEFORE (hardcoded):
const riskAmount = balance * 0.02;

// AFTER (config-aware):
const riskBase = config.compounding ? balance : config.initialCapital;
const riskPercent = config.riskPerTrade || 0.02;
const riskAmount = riskBase * riskPercent;
```

For leverage, multiply quantity:
```typescript
const leverageMultiplier = config.leverage || 1;
const quantity = (riskAmount / stopDistance) * leverageMultiplier;
```

Also update the `BacktestConfig` interface in the edge function to accept the new fields:
```typescript
interface BacktestConfig {
  // ...existing
  riskPerTrade?: number;
  compounding?: boolean;
  leverage?: number;
}
```

---

## 2. Leverage > 10x Warning Banner

**Problem:** Without liquidation modeling, leverage > 10x produces unrealistic results.

**File:** `src/components/strategy/BacktestRunner.tsx`

Add a warning alert below the leverage slider when `leverage > 10`:

```typescript
{isFutures && leverage > 10 && (
  <Alert className="border-[hsl(var(--chart-4))]/30">
    <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
    <AlertDescription className="text-sm">
      Liquidation modeling not enabled. Results at {leverage}x leverage may be unrealistic.
    </AlertDescription>
  </Alert>
)}
```

---

## 3. Expectancy: Ensure avgLoss Absolute Value Safety

**Problem:** Potential double-negative if avgLoss is already negative.

**Current state:** In `calculateMetrics` (backtest.ts line 422), `avgLoss` is computed as `grossLoss / losingTrades.length` where `grossLoss = Math.abs(...)`. So avgLoss is already positive. The formula is safe.

**Action:** Add explicit `Math.abs()` guard for defense-in-depth in both files:

**File:** `src/types/backtest.ts` (line 449)
```typescript
expectancy: winRate * avgWin - ((1 - winRate) * Math.abs(avgLoss)),
```

**File:** `supabase/functions/backtest-strategy/index.ts` (in its calculateMetrics)
Same guard applied.

---

## 4. Trade Density: Trades Per Week

**Problem:** 259 trades vs 10 trades have different statistical quality. No density context shown.

**File:** `src/components/strategy/BacktestResults.tsx`

Add a computed "Trades/Week" metric in the Detailed Metrics grid:

```typescript
const periodDays = (new Date(result.periodEnd).getTime() - new Date(result.periodStart).getTime()) / (1000 * 60 * 60 * 24);
const tradesPerWeek = periodDays > 0 ? (metrics.totalTrades / periodDays) * 7 : 0;
```

Display it next to "Total Trades":
```typescript
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Trade Density</span>
  <span className="font-medium font-mono">{tradesPerWeek.toFixed(1)}/week</span>
</div>
```

**File:** `src/lib/constants/backtest-config.ts`

Add to METRICS_CONFIG for comparison table:
```typescript
{ key: 'tradesPerWeek', label: 'Trades/Week', format: (v) => v.toFixed(1), higherIsBetter: true },
```

Note: Since this is a computed metric (not stored in BacktestMetrics), the comparison table will compute it on the fly from `totalTrades` and the period dates.

---

## 5. Fee Impact Breakdown (Gross vs Net)

**Problem:** Users cannot tell if strategy fails due to weak edge or high fees.

**File:** `src/types/backtest.ts`

Add to `BacktestMetrics`:
```typescript
grossPnl: number;        // PnL before commissions
totalCommissions: number; // Total fees paid
netPnl: number;          // PnL after commissions (same as totalReturnAmount)
```

**File:** `src/types/backtest.ts` (calculateMetrics function)

Compute from trades:
```typescript
const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0);
const grossPnl = totalPnl + totalCommissions; // Add back fees to get gross
```

Add to return object:
```typescript
grossPnl,
totalCommissions,
netPnl: totalPnl,
```

**File:** `supabase/functions/backtest-strategy/index.ts`

Same calculation in the edge function's `calculateMetrics`.

**File:** `src/components/strategy/BacktestResults.tsx`

Add a "Fee Impact" row in the Detailed Metrics section:
```typescript
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Gross P&L</span>
  <span className={cn("font-medium font-mono", metrics.grossPnl >= 0 ? "text-profit" : "text-loss")}>
    {format(metrics.grossPnl)}
  </span>
</div>
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Fees Paid</span>
  <span className="font-medium font-mono text-loss">-{format(metrics.totalCommissions)}</span>
</div>
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Net P&L</span>
  <span className={cn("font-medium font-mono", metrics.netPnl >= 0 ? "text-profit" : "text-loss")}>
    {format(metrics.netPnl)}
  </span>
</div>
```

---

## 6. Exposure Metric

**Problem:** No indication of how much time the strategy is in the market.

**File:** `src/types/backtest.ts`

Add to `BacktestMetrics`:
```typescript
exposurePercent: number;  // % of time in market
```

**File:** `src/types/backtest.ts` (calculateMetrics -- needs period info)

Since `calculateMetrics` currently only takes `trades` and `initialCapital`, we need to also accept `periodStart` and `periodEnd` as optional params:

```typescript
export function calculateMetrics(
  trades: BacktestTrade[], 
  initialCapital: number,
  periodStart?: string,
  periodEnd?: string
): BacktestMetrics {
```

Compute exposure:
```typescript
// Market exposure: total time in trades / total backtest period
let exposurePercent = 0;
if (periodStart && periodEnd && trades.length > 0) {
  const totalPeriodMs = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
  const totalInMarketMs = trades.reduce((sum, t) => {
    return sum + (new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime());
  }, 0);
  exposurePercent = totalPeriodMs > 0 ? (totalInMarketMs / totalPeriodMs) * 100 : 0;
}
```

**File:** `src/components/strategy/BacktestResults.tsx`

Display in Detailed Metrics:
```typescript
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Market Exposure</span>
  <span className="font-medium font-mono">{formatNumber(metrics.exposurePercent, 1)}%</span>
</div>
```

**File:** `supabase/functions/backtest-strategy/index.ts`

Update `calculateMetrics` call to pass period dates, and add same exposure calculation.

---

## Technical Summary

| File | Changes |
|------|---------|
| `supabase/functions/backtest-strategy/index.ts` | Use config.riskPerTrade, compounding, leverage in position sizing; add grossPnl/totalCommissions/exposurePercent to metrics; Math.abs guard on avgLoss |
| `src/types/backtest.ts` | Add grossPnl, totalCommissions, netPnl, exposurePercent to BacktestMetrics; update calculateMetrics signature and logic; Math.abs guard |
| `src/components/strategy/BacktestRunner.tsx` | Add leverage > 10x warning banner |
| `src/components/strategy/BacktestResults.tsx` | Display trades/week, fee breakdown (gross/fees/net), exposure %, in Detailed Metrics |
| `src/lib/constants/backtest-config.ts` | No changes needed (trades/week computed at display time) |

## What Does NOT Change

- Calmar ratio formula (verified: units are consistent, return%/drawdown%)
- Expectancy formula direction (avgLoss is already positive, but adding Math.abs guard)
- BacktestComparison.tsx (Y-axis fix already applied)
- Strategy form or types
