

# Strategy System: Statistical Depth & Integration Layer

Addresses 4 remaining gaps: Kelly safety, expectancy preview, validation logic, and strategy-performance integration.

---

## 1. Kelly Fraction Safety Guard + ATR Parameter Fields

**Problem:** Kelly sizing without verified win rate can overfit. ATR-based sizing has no configurable parameters.

### Kelly Guard

**File:** `src/components/strategy/StrategyFormDialog.tsx`

When `positionSizingModel === 'kelly'`:
- Force value to max 25% of full Kelly (Fractional Kelly 0.25x) via clamping
- Show a warning badge below the selector: "Kelly requires a reliable win-rate estimate from 50+ trades. Using 1/4 Kelly to limit risk."
- Change the value label from raw input to a display: "Fraction: 0.25x (max)"

**File:** `src/lib/constants/strategy-config.ts`

Add `KELLY_FRACTION_CAP: 0.25` and `KELLY_MIN_TRADES_WARNING: 50` constants.

### ATR Parameters

**File:** `src/components/strategy/StrategyFormDialog.tsx`

When `positionSizingModel === 'atr_based'`, show two additional inputs:
- ATR Period (default 14, range 5-50)
- ATR Multiplier (default 1.5, range 0.5-5.0)

**File:** `src/types/strategy.ts`

Extend `TradeManagement` or add to strategy type:
```typescript
atr_period?: number;      // default 14
atr_multiplier?: number;  // default 1.5
```

**Database:** Add two nullable columns (no migration needed if stored inside `trade_management` JSONB).

Store ATR params inside `trade_management` JSONB to avoid schema change:
```typescript
trade_management: {
  ...existing,
  atr_period: 14,
  atr_multiplier: 1.5,
}
```

---

## 2. Expectancy Preview Table (Pre-Save)

**Problem:** Users create strategies with R:R settings but have no preview of expected outcomes across different win rates.

### Implementation

**File:** New component `src/components/strategy/ExpectancyPreview.tsx`

A small card shown in the Exit tab of `StrategyFormDialog`, below the Effective R:R display.

Props: `effectiveRR: number | null`

When `effectiveRR` is available, render a sensitivity table:

```
Win Rate | Expectancy (per R risked)
20%      | -0.40R
25%      | -0.25R
30%      | -0.10R
35%      | +0.05R  <-- breakeven zone
40%      | +0.20R
50%      | +0.50R
```

Formula: `Expectancy = WR * R - (1 - WR)`

Where R = effectiveRR.

Highlight the breakeven row (where expectancy crosses zero) with a subtle accent.

If `effectiveRR` is null, show a muted message: "Define TP and SL in R:R units to see expectancy projections."

**File:** `src/components/strategy/StrategyFormDialog.tsx`

Import and render `ExpectancyPreview` in the Exit tab, after the Effective R:R badge and min_rr validation warning.

---

## 3. Structural Validation Layer (Pre-Save)

**Problem:** No logical contradiction detection. User can set min_confluences=3 with only 2 entry rules defined.

### Implementation

**File:** `src/components/strategy/StrategyFormDialog.tsx`

Add a `validationWarnings` useMemo that checks for logical issues before save:

```typescript
const validationWarnings = useMemo(() => {
  const warnings: string[] = [];
  
  // 1. Min confluences > total entry rules
  if (form.getValues('min_confluences') > entryRules.length) {
    warnings.push(`Min confluences (${form.getValues('min_confluences')}) exceeds total entry rules (${entryRules.length}).`);
  }
  
  // 2. Min confluences > mandatory rules count (impossible to fail)
  const mandatoryCount = entryRules.filter(r => r.is_mandatory).length;
  if (mandatoryCount >= form.getValues('min_confluences') && entryRules.length === mandatoryCount) {
    warnings.push('All rules are mandatory — min confluences has no effect.');
  }
  
  // 3. No exit rules defined
  if (exitRules.length === 0) {
    warnings.push('No exit rules defined. Strategy is incomplete without TP/SL.');
  }
  
  // 4. Effective R:R below min_rr
  if (effectiveRR !== null && effectiveRR < form.getValues('min_rr')) {
    warnings.push(`Effective R:R (${effectiveRR.toFixed(1)}) is below minimum (${form.getValues('min_rr')}).`);
  }
  
  // 5. Kelly without enough historical trades (informational)
  if (positionSizingModel === 'kelly') {
    warnings.push('Kelly sizing requires verified win-rate data. Using fractional Kelly (0.25x) until validated.');
  }

  // 6. Futures without leverage set
  if (selectedMarketType === 'futures' && defaultLeverage <= 1) {
    warnings.push('Futures strategy with 1x leverage — consider setting appropriate leverage.');
  }
  
  return warnings;
}, [entryRules, exitRules, effectiveRR, positionSizingModel, selectedMarketType, defaultLeverage, form]);
```

Render warnings as a collapsible alert section above the Save button:

```typescript
{validationWarnings.length > 0 && (
  <div className="space-y-1 p-3 rounded-lg bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/30">
    <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--chart-4))]">
      <AlertTriangle className="h-4 w-4" />
      {validationWarnings.length} validation warning{validationWarnings.length > 1 ? 's' : ''}
    </div>
    {validationWarnings.map((w, i) => (
      <p key={i} className="text-xs text-muted-foreground ml-6">{w}</p>
    ))}
  </div>
)}
```

These are warnings, not blockers. User can still save.

---

## 4. Strategy Adherence Tracking in AI Insights

**Problem:** AI Insights analyzes trades globally but does not show per-strategy adherence or performance breakdown.

### Data Source

The `strategy_adherence` field already exists in trade post-analysis (confirmed in `TradeDetail.tsx` and `TradeEnrichmentDrawer.tsx`). The `useStrategyPerformance` hook already groups trades by strategy and calculates win rate, profit factor, and quality score.

### Integration into AI Insights

**File:** `src/pages/AIInsights.tsx`

Import `useStrategyPerformance` and `useTradingStrategies`.

Add a new insight generation block in the insights useMemo:

```typescript
// Strategy adherence insights
const strategyPerformance = strategyPerfMap; // from hook
const strategies = strategiesData; // from hook

if (strategies && strategies.length > 0) {
  strategies.forEach(strategy => {
    const perf = strategyPerformance.get(strategy.id);
    if (!perf || perf.totalTrades < DATA_QUALITY.MIN_TRADES_FOR_RANKING) return;
    
    // Compare strategy performance vs overall
    const stratWR = perf.winRate * 100;
    const overallWR = stats.winRate;
    const delta = stratWR - overallWR;
    
    if (Math.abs(delta) > 10) {
      insights.push({
        type: delta > 0 ? 'positive' : 'negative',
        title: `${strategy.name}: ${delta > 0 ? 'Outperforming' : 'Underperforming'}`,
        description: `${stratWR.toFixed(0)}% win rate vs ${overallWR.toFixed(0)}% overall (${perf.totalTrades} trades). ${delta > 0 ? 'This strategy shows edge.' : 'Review setup quality or consider pausing.'}`,
        metric: `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`,
        icon: delta > 0 ? TrendingUp : TrendingDown,
        sampleSize: perf.totalTrades,
        confidence: perf.totalTrades >= 30 ? 'high' : perf.totalTrades >= 15 ? 'medium' : 'low',
      });
    }
  });
}
```

### Strategy Adherence Aggregation

For trades that have `post_analysis.strategy_adherence` values (text like "Good", "Partial", "Poor"), aggregate per strategy:

```typescript
// Count adherence ratings per strategy
const adherenceStats = new Map<string, { good: number; partial: number; poor: number; total: number }>();

closedTrades.forEach(trade => {
  if (!trade.strategies || !trade.post_analysis?.strategy_adherence) return;
  const rating = trade.post_analysis.strategy_adherence.toLowerCase();
  trade.strategies.forEach(s => {
    const stat = adherenceStats.get(s.id) || { good: 0, partial: 0, poor: 0, total: 0 };
    if (rating.includes('good') || rating.includes('high')) stat.good++;
    else if (rating.includes('partial') || rating.includes('medium')) stat.partial++;
    else stat.poor++;
    stat.total++;
    adherenceStats.set(s.id, stat);
  });
});
```

Generate an insight if a strategy has low adherence rate:

```typescript
adherenceStats.forEach((stat, stratId) => {
  if (stat.total < 10) return;
  const adherenceRate = (stat.good / stat.total) * 100;
  const stratName = strategies?.find(s => s.id === stratId)?.name || 'Unknown';
  
  if (adherenceRate < 50) {
    insights.push({
      type: 'negative',
      title: `Low Strategy Adherence: ${stratName}`,
      description: `Only ${adherenceRate.toFixed(0)}% of trades followed the strategy rules closely (${stat.total} trades). Discipline may be impacting results.`,
      metric: `${adherenceRate.toFixed(0)}%`,
      icon: AlertTriangle,
      sampleSize: stat.total,
      confidence: stat.total >= 20 ? 'medium' : 'low',
    });
  }
});
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/strategy/ExpectancyPreview.tsx` | New component: sensitivity table showing expectancy across win rates for given R:R |
| `src/components/strategy/StrategyFormDialog.tsx` | Kelly warning + cap; ATR params; validation warnings; ExpectancyPreview integration |
| `src/lib/constants/strategy-config.ts` | Add KELLY_FRACTION_CAP, KELLY_MIN_TRADES_WARNING constants |
| `src/types/strategy.ts` | Add optional atr_period/atr_multiplier to TradeManagement interface |
| `src/pages/AIInsights.tsx` | Import strategy hooks; generate per-strategy performance + adherence insights |

## What Does NOT Change

- Database schema (ATR params stored in existing trade_management JSONB)
- Backtest engine (separate iteration)
- Monte Carlo simulation (out of scope -- requires dedicated engine)
- Risk of Ruin calculation (requires Monte Carlo, deferred)
- YouTube import scoring logic
- Strategy sharing/cloning flow
