

# Metric Integrity Hardening: 7 Refinements

Targeted fixes for edge cases and consistency gaps identified after the initial metric integrity pass.

---

## Changes

### 1. Type-Safe R:R with `null` Instead of Magic Zero

**File:** `src/lib/trading-calculations.ts`

Change `avgRR` type from `number` to `number | null` in `TradingStats` interface. Return `null` when no trades have stop-loss data (currently returns `0`, which is ambiguous).

```typescript
// TradingStats interface
avgRR: number | null;

// In calculateTradingStats
const avgRR = rrValues.length > 0
  ? rrValues.reduce((sum, rr) => sum + Math.abs(rr), 0) / rrValues.length
  : null;

// emptyStats
avgRR: null,
```

**File:** `src/components/performance/PerformanceKeyMetrics.tsx`

Update guard to use `null` check:
```typescript
{stats.avgRR === null
  ? <span className="text-muted-foreground">N/A</span>
  : formatRatio(stats.avgRR)
}
```

**File:** `src/components/performance/PerformanceSummaryCard.tsx` -- no change needed (doesn't display R:R).

**Downstream callers** (`StrategyPerformance`, `BulkExport`, `FinalChecklist`): Update type references. `StrategyPerformance.avgRR` also becomes `number | null`.

### 2. Sharpe Ratio: Guard Zero Variance

**File:** `src/lib/trading-calculations.ts`

When `stdDev === 0`, Sharpe is mathematically undefined. Currently returns `0`. Change to `null`.

```typescript
// TradingStats interface
sharpeRatio: number | null;

// In calculateTradingStats
const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : null;
```

**File:** `src/components/performance/PerformanceKeyMetrics.tsx`

```typescript
<div className="text-xl font-bold">
  {stats.sharpeRatio === null
    ? <span className="text-muted-foreground">N/A</span>
    : stats.sharpeRatio.toFixed(2)
  }
</div>
```

### 3. Verdict Condition Reorder

**File:** `src/components/performance/PerformanceSummaryCard.tsx`

Current order checks `expectancy < 0.1` before `winRate < 40`. A low-win-rate system that is profitable is structurally more important than thin expectancy. Reorder:

```typescript
if (stats.totalPnl < 0) {
  // Unprofitable
} else if (stats.totalPnl > 0 && stats.winRate < 40) {
  // Profitable but inconsistent -- structural signal first
} else if (stats.totalPnl > 0 && stats.expectancy < 0.1) {
  // Borderline break-even -- thin edge second
} else if (stats.winRate >= 50 && stats.profitFactor >= 1.5) {
  // Consistently profitable
} else {
  // Moderately profitable
}
```

This is already the correct order in the current file (lines 19-29). Confirmed -- no change needed here.

### 4. Edge Badge Color Mapping

**File:** `src/components/performance/PerformanceSummaryCard.tsx`

Current `getEdgeLabel` returns Badge `variant` but all variants use the same muted palette. Map to semantic colors for instant scan:

| Edge | Badge variant | Tailwind class override |
|------|--------------|------------------------|
| Strong | `default` | green tint: `bg-profit/10 text-profit border-profit/20` |
| Moderate | `outline` | default (no override) |
| Low | `secondary` | yellow tint: `bg-yellow-500/10 text-yellow-600 border-yellow-500/20` |
| Negative | `destructive` | already red |

Use `className` overrides on the Badge rather than adding new variants.

### 5. initialBalance = 0 Warning

**File:** `src/components/performance/PerformanceKeyMetrics.tsx`

When `stats.maxDrawdownPercent > 0` and no initial balance is available (pass as prop), show a subtle hint under the Max Drawdown card:

```typescript
{!hasInitialBalance && stats.totalTrades > 0 && (
  <p className="text-xs text-muted-foreground">Set initial balance for accurate %</p>
)}
```

This requires passing a `hasInitialBalance: boolean` prop from Performance.tsx (derived from whether accounts data has a non-zero balance).

### 6. DrawdownChart Consistency Verification

**File:** `src/pages/Performance.tsx`

Currently `DrawdownChart` is called without `initialBalance`:
```typescript
<DrawdownChart trades={filteredTrades} />
```

Pass `initialBalance` to match `calculateTradingStats`:
```typescript
<DrawdownChart trades={filteredTrades} initialBalance={initialBalance} />
```

This ensures the chart and the key metric card always show the same number.

### 7. Context Tab -- Already Correct

The `PerformanceContextTab` already guards sections with `totalTrades > 0` (not `totalPnl !== 0`). Sections with valid data but zero PnL will still render. No change needed.

---

## Technical Details

### Type Change Ripple

Changing `avgRR` and `sharpeRatio` to `number | null` affects:

| Consumer | Impact |
|----------|--------|
| `PerformanceKeyMetrics` | Already guarded, update to `null` check |
| `PerformanceSummaryCard` | Does not display R:R or Sharpe |
| `BulkExport` | Uses `stats.avgRR` in export -- format as "N/A" when null |
| `FinalChecklist` | Passes stats to AI -- null is fine for AI context |
| `StrategyPerformance` | `avgRR` in strategy breakdown also becomes `number \| null` |
| `calculateStrategyPerformance` | Same null logic for per-strategy R:R |

### Edge Badge Colors

```typescript
function getEdgeBadgeClass(label: string): string {
  switch (label) {
    case 'Strong': return 'bg-profit/10 text-profit border-profit/20';
    case 'Low': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    default: return '';
  }
}
```

Applied via `className` on Badge, works with existing `variant` prop.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/trading-calculations.ts` | `avgRR` and `sharpeRatio` become `number \| null`; null returns for invalid states |
| `src/components/performance/PerformanceKeyMetrics.tsx` | Null checks for R:R and Sharpe; initialBalance warning |
| `src/components/performance/PerformanceSummaryCard.tsx` | Semantic badge colors for edge label |
| `src/pages/Performance.tsx` | Pass `initialBalance` to DrawdownChart |

---

## What Changes

| Before | After |
|--------|-------|
| `avgRR: 0` when no SL data (ambiguous) | `avgRR: null` (explicit "no data") |
| `sharpeRatio: 0` when zero variance | `sharpeRatio: null` (explicit "undefined") |
| Edge badge all same muted color | Green/Yellow/Red semantic tints |
| DrawdownChart missing initialBalance | Receives same initialBalance as stats |
| No warning when initialBalance = 0 | Subtle hint under Max Drawdown |

## What Does NOT Change

- Verdict condition order (already correct after review)
- Context tab guards (already uses `totalTrades > 0`)
- Drawdown formula itself (already fixed in prior pass)
- Calculation logic for other metrics
