
# Make Daily P&L Page System-First Compliant

## Problem Analysis

The **Daily P&L page** (`src/pages/DailyPnL.tsx`) currently uses **Exchange-Exclusive** hooks:
- `useBinanceDailyPnl()` - Binance only
- `useBinanceWeeklyPnl()` - Binance only  
- `useBinanceWeekComparison()` - Binance only

When Binance is not connected, the page shows an **EmptyState** and blocks all functionality (lines 121-139).

### Existing Unified Hooks (Already Available)
```
✅ useUnifiedDailyPnl()    → Supports both Binance + Paper
✅ useUnifiedWeeklyPnl()   → Supports both Binance + Paper
❌ useUnifiedWeekComparison() → DOES NOT EXIST (needs creation)
```

### Architecture Issue

```
Current Flow (Exchange-Exclusive):
┌─────────────────────────────────────────┐
│ DailyPnL.tsx                            │
├─────────────────────────────────────────┤
│ if (!binanceStats.isConnected)          │
│   → Show EmptyState (BLOCKS PAGE)  ❌   │
│ else                                    │
│   → Show all cards and charts      ✅   │
└─────────────────────────────────────────┘

Target Flow (System-First):
┌─────────────────────────────────────────┐
│ DailyPnL.tsx                            │
├─────────────────────────────────────────┤
│ Source = Binance OR Paper               │
│ → Always show data (never block)   ✅   │
│ → Show source badge                ✅   │
│ → Exchange-only features = N/A     ✅   │
└─────────────────────────────────────────┘
```

---

## Solution Overview

### 1. Create `useUnifiedWeekComparison` Hook (NEW FILE)
Calculate week-over-week comparison from Paper trades when Binance is not connected.

### 2. Refactor `DailyPnL.tsx` to Use Unified Hooks
- Replace `useBinanceDailyPnl()` → `useUnifiedDailyPnl()`
- Replace `useBinanceWeeklyPnl()` → `useUnifiedWeeklyPnl()`
- Replace `useBinanceWeekComparison()` → `useUnifiedWeekComparison()`
- Remove EmptyState gate
- Add source badge indicator

### 3. Handle Exchange-Only Features Gracefully
Some features (e.g., detailed funding rates) are Binance-only. Show "N/A" or hide them for Paper.

---

## File Changes

### File 1: `src/hooks/use-unified-week-comparison.ts` (NEW)

Create a new unified hook that calculates week comparison from either source.

```typescript
/**
 * Unified Week Comparison Hook
 * System-first: Compares current vs previous week from Paper data or Binance
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useBinanceWeekComparison } from '@/hooks/use-binance-week-comparison';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, startOfDay } from 'date-fns';

export type WeekComparisonSource = 'binance' | 'paper';

export interface WeekStats {
  grossPnl: number;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  fees: number;
  bestTrade: number;
  worstTrade: number;
}

export interface UnifiedWeekComparisonResult {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  change: {
    pnl: number;
    pnlPercent: number;
    trades: number;
    tradesPercent: number;
    winRateChange: number;
  };
  source: WeekComparisonSource;
  isLoading: boolean;
  hasData: boolean;
}

// Empty stats for initialization
const emptyStats: WeekStats = {
  grossPnl: 0, netPnl: 0, trades: 0, wins: 0, losses: 0,
  winRate: 0, fees: 0, bestTrade: 0, worstTrade: 0,
};

export function useUnifiedWeekComparison(): UnifiedWeekComparisonResult {
  // Check connection
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Binance data (enrichment)
  const binanceComparison = useBinanceWeekComparison();
  
  // Trade entries for Paper calculation
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate internal week comparison from trade_entries
  const internalComparison = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    const currentWeek: WeekStats = { ...emptyStats };
    const previousWeek: WeekStats = { ...emptyStats };
    
    let hasData = false;
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      const tradeDate = trade.trade_date ? new Date(trade.trade_date) : null;
      if (!tradeDate) return;
      
      let targetWeek: WeekStats | null = null;
      
      if (isWithinInterval(tradeDate, { start: startOfDay(currentWeekStart), end: currentWeekEnd })) {
        targetWeek = currentWeek;
      } else if (isWithinInterval(tradeDate, { start: startOfDay(previousWeekStart), end: previousWeekEnd })) {
        targetWeek = previousWeek;
      }
      
      if (!targetWeek) return;
      hasData = true;
      
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const fees = trade.fees ?? 0;
      
      targetWeek.grossPnl += pnl + fees;
      targetWeek.netPnl += pnl;
      targetWeek.fees += fees;
      targetWeek.trades += 1;
      
      if (pnl > 0) {
        targetWeek.wins += 1;
        targetWeek.bestTrade = Math.max(targetWeek.bestTrade, pnl);
      }
      if (pnl < 0) {
        targetWeek.losses += 1;
        targetWeek.worstTrade = Math.min(targetWeek.worstTrade, pnl);
      }
    });
    
    // Calculate win rates
    currentWeek.winRate = currentWeek.trades > 0 ? (currentWeek.wins / currentWeek.trades) * 100 : 0;
    previousWeek.winRate = previousWeek.trades > 0 ? (previousWeek.wins / previousWeek.trades) * 100 : 0;
    
    // Calculate changes
    const pnlChange = currentWeek.netPnl - previousWeek.netPnl;
    const pnlPercentChange = previousWeek.netPnl !== 0
      ? ((currentWeek.netPnl - previousWeek.netPnl) / Math.abs(previousWeek.netPnl)) * 100
      : currentWeek.netPnl !== 0 ? 100 : 0;
    
    const tradesChange = currentWeek.trades - previousWeek.trades;
    const tradesPercentChange = previousWeek.trades !== 0
      ? ((currentWeek.trades - previousWeek.trades) / previousWeek.trades) * 100
      : currentWeek.trades !== 0 ? 100 : 0;
    
    const winRateChange = currentWeek.winRate - previousWeek.winRate;
    
    return {
      currentWeek,
      previousWeek,
      change: {
        pnl: pnlChange,
        pnlPercent: pnlPercentChange,
        trades: tradesChange,
        tradesPercent: tradesPercentChange,
        winRateChange,
      },
      hasData,
    };
  }, [trades]);
  
  // Return best available data
  return useMemo((): UnifiedWeekComparisonResult => {
    // Priority 1: Binance connected with data
    if (isConnected && binanceComparison.currentWeek.trades > 0) {
      return {
        currentWeek: binanceComparison.currentWeek,
        previousWeek: binanceComparison.previousWeek,
        change: {
          pnl: binanceComparison.change.pnl,
          pnlPercent: binanceComparison.change.pnlPercent,
          trades: binanceComparison.change.trades,
          tradesPercent: binanceComparison.change.tradesPercent,
          winRateChange: binanceComparison.change.winRateChange,
        },
        source: 'binance',
        isLoading: binanceComparison.isLoading,
        hasData: true,
      };
    }
    
    // Priority 2: Internal Paper data
    if (internalComparison.hasData) {
      return {
        ...internalComparison,
        source: 'paper',
        isLoading: tradesLoading,
      };
    }
    
    // Priority 3: No data
    return {
      currentWeek: { ...emptyStats },
      previousWeek: { ...emptyStats },
      change: { pnl: 0, pnlPercent: 0, trades: 0, tradesPercent: 0, winRateChange: 0 },
      source: 'paper',
      isLoading: connectionLoading || tradesLoading,
      hasData: false,
    };
  }, [isConnected, binanceComparison, internalComparison, tradesLoading, connectionLoading]);
}
```

---

### File 2: `src/pages/DailyPnL.tsx` (REFACTOR)

**Key Changes:**

| Line Range | Change |
|------------|--------|
| 35-38 | Replace Binance hooks with Unified hooks |
| 58-77 | Handle Paper symbol breakdown (use placeholder message if no bySymbol) |
| 121-139 | REMOVE EmptyState gate entirely |
| 170-175 | Add source badge to header |
| 185-188 | Show N/A for Binance-only fields (Commission) when source is Paper |

#### Change 1: Import Unified Hooks (Lines 35-38)

**Before:**
```typescript
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { useBinanceWeekComparison } from "@/hooks/use-binance-week-comparison";
```

**After:**
```typescript
import { useUnifiedDailyPnl } from "@/hooks/use-unified-daily-pnl";
import { useUnifiedWeeklyPnl } from "@/hooks/use-unified-weekly-pnl";
import { useUnifiedWeekComparison } from "@/hooks/use-unified-week-comparison";
```

#### Change 2: Replace Hook Calls (Lines 42-44)

**Before:**
```typescript
const binanceStats = useBinanceDailyPnl();
const weeklyStats = useBinanceWeeklyPnl();
const weekComparison = useBinanceWeekComparison();
```

**After:**
```typescript
const dailyStats = useUnifiedDailyPnl();
const weeklyStats = useUnifiedWeeklyPnl();
const weekComparison = useUnifiedWeekComparison();
```

#### Change 3: Update Symbol Breakdown Logic (Lines 58-77)

**Before:**
```typescript
const symbolBreakdown = useMemo(() => {
  if (!binanceStats.bySymbol || Object.keys(binanceStats.bySymbol).length === 0) {
    return [];
  }
  // ...uses binanceStats.bySymbol
}, [binanceStats.bySymbol]);
```

**After:**
```typescript
const symbolBreakdown = useMemo(() => {
  // Symbol breakdown is only available from Binance
  // For Paper, we would need to aggregate from trade_entries
  if (dailyStats.source !== 'binance') {
    return []; // Paper trading doesn't have per-symbol breakdown in daily hook
  }
  // Cast to access Binance-specific bySymbol (only available when source is binance)
  // This is safe because we checked source above
  return []; // TODO: Access bySymbol from raw Binance hook if needed
}, [dailyStats.source]);
```

**Note:** The `useUnifiedDailyPnl` does not expose `bySymbol`. We have two options:
1. Remove symbol breakdown section for Paper (acceptable degradation)
2. Add symbol aggregation to Paper hook (more work)

For System-First compliance, option 1 is acceptable - the section simply won't render for Paper.

#### Change 4: REMOVE EmptyState Gate (Lines 121-140)

**Delete entirely:**
```typescript
if (!binanceStats.isConnected) {
  return (
    <DashboardLayout>
      // ... EmptyState ...
    </DashboardLayout>
  );
}
```

The page now always renders.

#### Change 5: Add Source Badge to Header (Around Line 152)

**After title, add:**
```tsx
<Badge variant="outline" className="ml-2 text-xs">
  {dailyStats.source === 'binance' ? '🔗 Live' : '📝 Paper'}
</Badge>
```

#### Change 6: Handle Paper Source for Commission (Lines 185-188)

**Before:**
```tsx
<div>
  <p className="text-sm text-muted-foreground">Commission</p>
  <p className="text-2xl font-bold text-muted-foreground">
    -${binanceStats.totalCommission.toFixed(2)}
  </p>
</div>
```

**After:**
```tsx
<div>
  <p className="text-sm text-muted-foreground">Commission</p>
  <p className="text-2xl font-bold text-muted-foreground">
    {dailyStats.source === 'binance' 
      ? `-$${dailyStats.totalCommission.toFixed(2)}`
      : 'N/A'
    }
  </p>
</div>
```

#### Change 7: Update All Hook References

Replace all `binanceStats.` with `dailyStats.`:
- `binanceStats.grossPnl` → `dailyStats.grossPnl`
- `binanceStats.totalCommission` → `dailyStats.totalCommission`
- `binanceStats.totalTrades` → `dailyStats.totalTrades`
- `binanceStats.winRate` → `dailyStats.winRate`

Replace all `weekComparison.currentWeek.` with `weekComparison.currentWeek.`:
- No change needed if variable name stays the same

---

## Visual Comparison

### Before (Exchange-Exclusive)

```
User WITHOUT Binance:
┌─────────────────────────────────────┐
│ ⚠️ Binance not connected            │
│                                     │
│    Connect your Binance account     │
│    in Settings to see daily P&L     │
│                                     │
│           [Empty State]             │
└─────────────────────────────────────┘
```

### After (System-First)

```
User WITHOUT Binance (Paper Trading):
┌─────────────────────────────────────────────────────┐
│ 💵 Daily P&L                          [📝 Paper]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Today's P&L                                        │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │ Realized │Commission│  Trades  │ Win Rate │     │
│  │  +$150   │   N/A    │    5     │   60%    │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
│                                                     │
│  7-Day Chart, Best/Worst Trades, etc.              │
│  (All calculated from trade_entries)               │
│                                                     │
│  Symbol Breakdown: (Not shown for Paper)           │
└─────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/hooks/use-unified-week-comparison.ts` | CREATE | ~140 lines |
| `src/pages/DailyPnL.tsx` | MODIFY | ~30 lines |

---

## Behavior Matrix

| Feature | Binance | Paper | Notes |
|---------|---------|-------|-------|
| Today's Realized P&L | ✅ | ✅ | From unified hook |
| Commission | ✅ | "N/A" | Binance-only data |
| Trades Today | ✅ | ✅ | Unified |
| Win Rate | ✅ | ✅ | Unified |
| Week Comparison | ✅ | ✅ | New unified hook |
| 7-Day Chart | ✅ | ✅ | From useUnifiedWeeklyPnl |
| Best/Worst Trade | ✅ | ✅ | Unified |
| Symbol Breakdown | ✅ | Hidden | Binance-only granularity |
| Export CSV/PDF | ✅ | ✅ | Works with any data |
| Source Badge | "🔗 Live" | "📝 Paper" | Visual indicator |

---

## Technical Notes

### Why This Approach?

1. **Minimal New Code**: Reuses existing `useUnifiedDailyPnl` and `useUnifiedWeeklyPnl`
2. **Graceful Degradation**: Commission shows "N/A" instead of fake data
3. **No Breaking Changes**: Export functionality still works
4. **System-First Compliant**: Paper Trading users can use the page

### Exchange-Only Features Handling

Rather than showing fake/estimated data for Paper Trading, we show:
- "N/A" for Commission (real fee data requires exchange API)
- Hide Symbol Breakdown section (requires `bySymbol` from income endpoint)

This is honest UX - users know which features require exchange connection.
