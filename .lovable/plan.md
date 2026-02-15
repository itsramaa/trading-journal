
# Backtest System: Configuration Completeness & Results Integrity

Addresses 10 issues across the Run and Compare tabs: missing config fields, absent metrics, broken chart scaling, and lack of edge diagnostics.

---

## Scope & Priority

**Tier 1 -- Critical Config Gaps (Run tab)**
1. Slippage input field
2. Risk per trade / position sizing config
3. Timeframe display clarity
4. Leverage input (futures strategies)
5. Initial Capital UX clarification

**Tier 2 -- Results Intelligence (Results + Compare)**
6. Break-even threshold insight banner
7. Expectancy metric in results
8. CAGR + Sortino + Calmar in comparison table
9. Equity curve Y-axis scaling fix

**Tier 3 -- Deferred (out of scope)**
10. Monte Carlo / Walk-forward (requires dedicated simulation engine -- not journal scope)

---

## 1. Slippage Input Field

**Problem:** Commission exists but slippage is missing from the config form despite being defined in `BacktestConfig.slippage`.

**File:** `src/components/strategy/BacktestRunner.tsx`

Add a slippage state and input next to the commission field:

```typescript
const [slippage, setSlippage] = useState<number>(BACKTEST_DEFAULTS.SLIPPAGE * 100); // 0.1%
```

Add to config in `handleRunBacktest`:
```typescript
slippage: slippage / 100, // Convert percentage to decimal
```

Render a slippage input alongside commission in the Capital & Commission grid (change to 3-column on md):
- Label: "Slippage (%)"
- Default: 0.1
- Range: 0-2, step 0.01
- Helper text: "Estimated price impact per fill"

**File:** `src/lib/constants/backtest-config.ts`

Add to `BACKTEST_DEFAULTS`:
```typescript
MIN_SLIPPAGE: 0,
MAX_SLIPPAGE: 2,
SLIPPAGE_STEP: 0.01,
```

---

## 2. Risk Per Trade / Position Sizing Config

**Problem:** No risk-per-trade or compounding toggle. Backtest assumes flat position sizing.

**File:** `src/components/strategy/BacktestRunner.tsx`

Add two new fields below Initial Capital:
- **Risk Per Trade (%)**: Default 2%, range 0.5-10%, step 0.5
- **Compounding**: Toggle (on/off). When ON, position size recalculates from current equity. When OFF, always uses initial capital.

**File:** `src/types/backtest.ts`

Extend `BacktestConfig`:
```typescript
riskPerTrade?: number;   // e.g., 0.02 for 2%
compounding?: boolean;   // recalculate from running equity
```

These get passed to the edge function which will use them for position sizing in the simulation.

---

## 3. Timeframe Display & Strategy Context

**Problem:** Timeframe is shown in strategy info alert but not as a prominent config element. Users may not realize which TF the backtest runs on.

**Solution:** This is NOT a separate input -- the timeframe comes from the strategy definition. But it needs to be displayed prominently.

**File:** `src/components/strategy/BacktestRunner.tsx`

When a strategy is selected, show a prominent info badge row above the Run button (outside the collapsible alert):

```typescript
{selectedStrategy && (
  <div className="flex flex-wrap gap-2">
    <Badge variant="secondary">
      TF: {selectedStrategy.timeframe || 'Not set'}
    </Badge>
    {selectedStrategy.market_type === 'futures' && (
      <Badge variant="secondary">
        Leverage: {selectedStrategy.default_leverage || 1}x
      </Badge>
    )}
    <Badge variant="secondary">
      Sizing: {selectedStrategy.position_sizing_model || 'fixed_percent'}
    </Badge>
  </div>
)}
```

If `selectedStrategy.timeframe` is null/empty, show a warning: "Strategy has no timeframe defined. Backtest results may be unreliable."

---

## 4. Leverage Input (Futures)

**Problem:** Futures strategies lack leverage configuration in the backtest form.

**File:** `src/components/strategy/BacktestRunner.tsx`

When `selectedStrategy?.market_type === 'futures'`, show a leverage slider:
- Label: "Leverage"
- Default: pulled from `selectedStrategy.default_leverage || 1`
- Range: 1-125x
- Show as state variable so user can override per-backtest

**File:** `src/types/backtest.ts`

Add to `BacktestConfig`:
```typescript
leverage?: number;  // default 1, max 125
```

Pass to edge function in `handleRunBacktest`.

---

## 5. Initial Capital UX Clarification

**Problem:** Quick-fill buttons showing Binance/account balances alongside the 10000 default is confusing.

**File:** `src/components/strategy/BacktestRunner.tsx`

Add a helper text below the quick-fill buttons:
```typescript
<p className="text-xs text-muted-foreground mt-1">
  Backtest uses simulated capital — not your actual account balance. Quick-fill buttons copy your current balance for realistic simulation.
</p>
```

---

## 6. Break-Even Threshold Insight Banner

**Problem:** Results show -85% return but don't explain WHY. With 20% WR and 2.68 R:R, the breakeven WR is 27.2% -- the strategy is mathematically below edge.

**File:** `src/components/strategy/BacktestResults.tsx`

After the Summary Card, add a diagnostic banner:

```typescript
const breakevenWR = 1 / (1 + metrics.avgRiskReward);
const isBelowBreakeven = metrics.winRate < breakevenWR;
const expectancy = (metrics.winRate * metrics.avgWin) - ((1 - metrics.winRate) * metrics.avgLoss);

{metrics.avgRiskReward > 0 && isBelowBreakeven && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      <strong>Below break-even threshold.</strong> Win rate ({(metrics.winRate * 100).toFixed(1)}%) 
      is below the break-even requirement ({(breakevenWR * 100).toFixed(1)}%) for the observed 
      {metrics.avgRiskReward.toFixed(2)} R:R. Expected loss per trade: {format(Math.abs(expectancy))}.
    </AlertDescription>
  </Alert>
)}
```

Also show a positive variant when above breakeven with a healthy margin.

---

## 7. Expectancy Metric in Results

**Problem:** Avg Win, Avg Loss, and Win Rate are shown but Expectancy is not calculated or displayed.

**File:** `src/types/backtest.ts`

Add to `BacktestMetrics`:
```typescript
expectancy: number;        // (WR * avgWin) - (LR * avgLoss)
expectancyPerR: number;    // WR * R - (1 - WR)
```

**File:** `src/types/backtest.ts` (in `calculateMetrics`)

Compute expectancy in the existing `calculateMetrics` function:
```typescript
expectancy: (winRate * avgWin) - ((1 - winRate) * avgLoss),
expectancyPerR: avgRiskReward > 0 ? (winRate * avgRiskReward) - (1 - winRate) : 0,
```

**File:** `src/components/strategy/BacktestResults.tsx`

Add expectancy to the Detailed Metrics grid:
```typescript
<div className="flex justify-between items-center">
  <span className="text-muted-foreground text-sm">Expectancy</span>
  <span className={cn("font-medium font-mono", metrics.expectancy >= 0 ? "text-profit" : "text-loss")}>
    {format(metrics.expectancy)}/trade
  </span>
</div>
```

---

## 8. CAGR + Sortino + Calmar in Comparison

**Problem:** Compare tab only shows Sharpe. Crypto needs Sortino and Calmar. Total Return without CAGR is misleading across different periods.

**File:** `src/lib/constants/backtest-config.ts`

Add new entries to `METRICS_CONFIG`:

```typescript
{ key: 'expectancy', label: 'Expectancy', format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
{ key: 'calmarRatio', label: 'Calmar Ratio', format: (v) => v.toFixed(2), higherIsBetter: true },
```

**File:** `src/types/backtest.ts`

Add to `BacktestMetrics`:
```typescript
calmarRatio: number;   // annualized return / max drawdown
```

Compute in `calculateMetrics`:
```typescript
// Calmar = Annualized Return / MaxDD
calmarRatio: maxDD > 0 ? (totalReturn / periodYears) / (maxDD * 100) : 0,
```

Note: CAGR and Sortino are best computed with the full trade series and time period. CAGR will be computed at display time in the results component using `periodStart`/`periodEnd` dates rather than storing in metrics, since it needs the date range.

**File:** `src/components/strategy/BacktestResults.tsx`

Add CAGR as a computed display metric:
```typescript
const periodDays = (new Date(result.periodEnd).getTime() - new Date(result.periodStart).getTime()) / (1000 * 60 * 60 * 24);
const periodYears = periodDays / 365;
const cagr = periodYears > 0 
  ? (Math.pow(result.finalCapital / result.initialCapital, 1 / periodYears) - 1) * 100 
  : metrics.totalReturn;
```

Display below Total Return in the metrics grid.

---

## 9. Equity Curve Y-Axis Fix

**Problem:** Comparison chart shows "$0k / $0k / $0k" when values are small (e.g., equity drops to < $1000).

**File:** `src/components/strategy/BacktestComparison.tsx`

Fix the Y-axis formatter to handle small values:

```typescript
<YAxis 
  tickFormatter={(v) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  }}
  domain={['dataMin', 'dataMax']}
  className="text-muted-foreground"
/>
```

Adding `domain={['dataMin', 'dataMax']}` ensures the axis scales to the actual data range rather than defaulting to 0-based.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/strategy/BacktestRunner.tsx` | Add slippage input, risk-per-trade, compounding toggle, leverage slider (futures), timeframe badge row, capital helper text |
| `src/types/backtest.ts` | Extend BacktestConfig with riskPerTrade, compounding, leverage; extend BacktestMetrics with expectancy, expectancyPerR, calmarRatio |
| `src/types/backtest.ts` (calculateMetrics) | Compute expectancy, expectancyPerR, calmarRatio |
| `src/components/strategy/BacktestResults.tsx` | Break-even insight banner, expectancy display, CAGR computed metric |
| `src/components/strategy/BacktestComparison.tsx` | Fix Y-axis formatter for small values, add domain auto-scaling |
| `src/lib/constants/backtest-config.ts` | Add slippage constraints, expectancy + calmar to METRICS_CONFIG |

## What Does NOT Change

- Edge function `backtest-strategy` (will consume new config fields in a backend iteration)
- Monte Carlo simulation (out of scope -- requires separate engine, not journal feature)
- Walk-forward optimization (quant tool, not trading journal)
- Liquidation modeling (requires exchange-specific margin logic)
- Funding rate awareness (requires historical funding data API)
